const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/error.middleware');

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  creator: { select: { id: true, name: true, email: true, avatar: true } },
  tags: true,
  board: { select: { id: true, name: true, projectId: true } },
  comments: {
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  },
  activityLogs: {
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  },
};

const createTask = asyncHandler(async (req, res) => {
  const { boardId } = req.params;
  const { title, description, status, priority, dueDate, assigneeId, tags } = req.body;
  const userId = req.user.id;

  // Get max position in board
  const maxPosition = await prisma.task.aggregate({
    where: { boardId },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      dueDate: dueDate ? new Date(dueDate) : null,
      boardId,
      assigneeId,
      creatorId: userId,
      position: (maxPosition._max.position || 0) + 1,
      tags: tags
        ? { create: tags.map((t) => ({ name: t.name, color: t.color || '#6366f1' })) }
        : undefined,
    },
    include: taskInclude,
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: 'CREATED',
      details: `Task "${title}" was created`,
      taskId: task.id,
      userId,
    },
  });

  res.status(201).json({ success: true, message: 'Task created', data: task });
});

const getTasks = asyncHandler(async (req, res) => {
  const { boardId } = req.params;
  const { status, priority, assigneeId, search, page = 1, limit = 50 } = req.query;

  const where = { boardId };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        tags: true,
        _count: { select: { comments: true } },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      skip,
      take: parseInt(limit),
    }),
    prisma.task.count({ where }),
  ]);

  res.json({
    success: true,
    data: tasks,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
  });
});

const getTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskInclude,
  });

  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  res.json({ success: true, data: task });
});

const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status, priority, dueDate, assigneeId } = req.body;
  const userId = req.user.id;

  const oldTask = await prisma.task.findUnique({ where: { id: taskId } });
  if (!oldTask) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(assigneeId !== undefined && { assigneeId }),
    },
    include: taskInclude,
  });

  // Log activity
  const changes = [];
  if (status && status !== oldTask.status) changes.push(`Status changed from ${oldTask.status} to ${status}`);
  if (priority && priority !== oldTask.priority) changes.push(`Priority changed from ${oldTask.priority} to ${priority}`);
  if (assigneeId !== undefined && assigneeId !== oldTask.assigneeId) changes.push('Assignee updated');

  if (changes.length > 0) {
    await prisma.activityLog.create({
      data: {
        action: 'UPDATED',
        details: changes.join('. '),
        taskId,
        userId,
      },
    });
  }

  res.json({ success: true, message: 'Task updated', data: task });
});

const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  await prisma.task.delete({ where: { id: taskId } });
  res.json({ success: true, message: 'Task deleted' });
});

const moveTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { boardId, position, status } = req.body;
  const userId = req.user.id;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(boardId && { boardId }),
      ...(position !== undefined && { position }),
      ...(status && { status }),
    },
    include: taskInclude,
  });

  await prisma.activityLog.create({
    data: {
      action: 'MOVED',
      details: `Task moved${status ? ` to ${status}` : ''}`,
      taskId,
      userId,
    },
  });

  res.json({ success: true, message: 'Task moved', data: task });
});

// Comments
const addComment = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  const comment = await prisma.comment.create({
    data: { content, taskId, userId },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });

  await prisma.activityLog.create({
    data: { action: 'COMMENTED', details: 'Added a comment', taskId, userId },
  });

  res.status(201).json({ success: true, data: comment });
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
  if (comment.userId !== userId) return res.status(403).json({ success: false, message: 'Not authorized' });

  await prisma.comment.delete({ where: { id: commentId } });
  res.json({ success: true, message: 'Comment deleted' });
});

module.exports = { createTask, getTasks, getTask, updateTask, deleteTask, moveTask, addComment, deleteComment };

const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/error.middleware');

const createBoard = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description } = req.body;

  const board = await prisma.board.create({
    data: { name, description, projectId },
    include: { _count: { select: { tasks: true } } },
  });

  res.status(201).json({ success: true, message: 'Board created', data: board });
});

const getBoards = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const boards = await prisma.board.findMany({
    where: { projectId },
    include: {
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true, avatar: true } },
          creator: { select: { id: true, name: true, email: true, avatar: true } },
          tags: true,
          _count: { select: { comments: true } },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ success: true, data: boards });
});

const updateBoard = asyncHandler(async (req, res) => {
  const { boardId } = req.params;
  const { name, description } = req.body;

  const board = await prisma.board.update({
    where: { id: boardId },
    data: { name, description },
  });

  res.json({ success: true, message: 'Board updated', data: board });
});

const deleteBoard = asyncHandler(async (req, res) => {
  const { boardId } = req.params;
  await prisma.board.delete({ where: { id: boardId } });
  res.json({ success: true, message: 'Board deleted' });
});

module.exports = { createBoard, getBoards, updateBoard, deleteBoard };

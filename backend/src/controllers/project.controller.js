const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/error.middleware');

const createProject = asyncHandler(async (req, res) => {
  const { name, description, color } = req.body;
  const userId = req.user.id;

  const project = await prisma.project.create({
    data: {
      name,
      description,
      color: color || '#6366f1',
      ownerId: userId,
      members: {
        create: { userId, role: 'OWNER' },
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
      _count: { select: { boards: true } },
    },
  });

  res.status(201).json({ success: true, message: 'Project created', data: project });
});

const getProjects = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const projects = await prisma.project.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
      _count: { select: { boards: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: projects });
});

const getProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
      boards: {
        include: {
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  res.json({ success: true, data: project });
});

const updateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, color } = req.body;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { name, description, color },
    include: {
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
    },
  });

  res.json({ success: true, message: 'Project updated', data: project });
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user.id;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (project.ownerId !== userId) {
    return res.status(403).json({ success: false, message: 'Only owner can delete project' });
  }

  await prisma.project.delete({ where: { id: projectId } });
  res.json({ success: true, message: 'Project deleted' });
});

const inviteMember = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { email, role = 'MEMBER' } = req.body;

  const userToInvite = await prisma.user.findUnique({ where: { email } });
  if (!userToInvite) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: userToInvite.id } },
  });
  if (existing) {
    return res.status(409).json({ success: false, message: 'User is already a member' });
  }

  const member = await prisma.projectMember.create({
    data: { projectId, userId: userToInvite.id, role },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });

  res.status(201).json({ success: true, message: 'Member invited', data: member });
});

const removeMember = asyncHandler(async (req, res) => {
  const { projectId, memberId } = req.params;

  await prisma.projectMember.deleteMany({
    where: { projectId, userId: memberId },
  });

  res.json({ success: true, message: 'Member removed' });
});

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  inviteMember,
  removeMember,
};

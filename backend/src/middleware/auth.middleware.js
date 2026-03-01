const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, avatar: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const requireProjectAccess = (roles = []) => async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Owner always has access
    if (project.ownerId === userId) {
      req.project = project;
      req.memberRole = 'OWNER';
      return next();
    }

    const member = project.members.find((m) => m.userId === userId);
    if (!member) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (roles.length > 0 && !roles.includes(member.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    req.project = project;
    req.memberRole = member.role;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate, requireProjectAccess };

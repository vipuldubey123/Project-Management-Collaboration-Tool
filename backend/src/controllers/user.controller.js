const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/error.middleware');

const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q || '' } },
        { email: { contains: q || '' } },
      ],
    },
    select: { id: true, name: true, email: true, avatar: true },
    take: 10,
  });

  res.json({ success: true, data: users });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;
  const userId = req.user.id;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...(name && { name }), ...(avatar && { avatar }) },
    select: { id: true, name: true, email: true, avatar: true },
  });

  res.json({ success: true, data: user });
});

module.exports = { searchUsers, updateProfile };

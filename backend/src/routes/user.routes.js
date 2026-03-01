const router = require('express').Router();
const { searchUsers, updateProfile } = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/search', searchUsers);
router.put('/profile', updateProfile);

module.exports = router;

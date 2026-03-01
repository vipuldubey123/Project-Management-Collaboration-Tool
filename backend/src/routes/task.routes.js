const router = require('express').Router();
const { body } = require('express-validator');
const {
  createTask, getTasks, getTask, updateTask, deleteTask, moveTask, addComment, deleteComment,
} = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);

router.post('/boards/:boardId/tasks',
  [body('title').trim().notEmpty().withMessage('Task title is required')],
  validate,
  createTask
);

router.get('/boards/:boardId/tasks', getTasks);
router.get('/tasks/:taskId', getTask);

router.put('/tasks/:taskId',
  [body('title').optional().trim().notEmpty().withMessage('Task title cannot be empty')],
  validate,
  updateTask
);

router.delete('/tasks/:taskId', deleteTask);
router.patch('/tasks/:taskId/move', moveTask);

// Comments
router.post('/tasks/:taskId/comments',
  [body('content').trim().notEmpty().withMessage('Comment content is required')],
  validate,
  addComment
);

router.delete('/comments/:commentId', deleteComment);

module.exports = router;

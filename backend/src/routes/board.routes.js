const router = require('express').Router();
const { body } = require('express-validator');
const { createBoard, getBoards, updateBoard, deleteBoard } = require('../controllers/board.controller');
const { authenticate, requireProjectAccess } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);

router.post('/:projectId/boards',
  requireProjectAccess(),
  [body('name').trim().notEmpty().withMessage('Board name is required')],
  validate,
  createBoard
);

router.get('/:projectId/boards', requireProjectAccess(), getBoards);

router.put('/:projectId/boards/:boardId',
  requireProjectAccess(['OWNER', 'ADMIN']),
  updateBoard
);

router.delete('/:projectId/boards/:boardId',
  requireProjectAccess(['OWNER', 'ADMIN']),
  deleteBoard
);

module.exports = router;

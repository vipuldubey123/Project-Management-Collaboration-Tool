const router = require('express').Router();
const { body } = require('express-validator');
const {
  createProject, getProjects, getProject, updateProject, deleteProject, inviteMember, removeMember,
} = require('../controllers/project.controller');
const { authenticate, requireProjectAccess } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);

router.post('/',
  [body('name').trim().notEmpty().withMessage('Project name is required')],
  validate,
  createProject
);

router.get('/', getProjects);
router.get('/:projectId', requireProjectAccess(), getProject);

router.put('/:projectId',
  requireProjectAccess(['OWNER', 'ADMIN']),
  [body('name').trim().notEmpty().withMessage('Project name is required')],
  validate,
  updateProject
);

router.delete('/:projectId', requireProjectAccess(['OWNER']), deleteProject);

router.post('/:projectId/members',
  requireProjectAccess(['OWNER', 'ADMIN']),
  [body('email').isEmail().withMessage('Valid email required')],
  validate,
  inviteMember
);

router.delete('/:projectId/members/:memberId', requireProjectAccess(['OWNER', 'ADMIN']), removeMember);

module.exports = router;

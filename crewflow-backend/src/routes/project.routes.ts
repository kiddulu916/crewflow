import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission, Permission } from '../utils/rbac';

const router = Router();
const projectController = new ProjectController();

// All routes require authentication
router.use(authenticate);

router.post('/', requirePermission(Permission.MANAGE_PROJECTS), (req, res) =>
  projectController.createProject(req, res)
);

router.get('/', (req, res) => projectController.listProjects(req, res));

router.get('/:id', (req, res) => projectController.getProject(req, res));

router.put('/:id', requirePermission(Permission.MANAGE_PROJECTS), (req, res) =>
  projectController.updateProject(req, res)
);

router.delete('/:id', requirePermission(Permission.MANAGE_PROJECTS), (req, res) =>
  projectController.deleteProject(req, res)
);

export default router;

import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission, Permission } from '../utils/rbac';

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticate);

router.post('/', requirePermission(Permission.MANAGE_USERS), (req, res) =>
  userController.createUser(req, res)
);

router.get('/', (req, res) => userController.listUsers(req, res));

router.get('/:id', (req, res) => userController.getUser(req, res));

router.put('/:id', requirePermission(Permission.MANAGE_USERS), (req, res) =>
  userController.updateUser(req, res)
);

router.delete('/:id', requirePermission(Permission.MANAGE_USERS), (req, res) =>
  userController.deleteUser(req, res)
);

export default router;

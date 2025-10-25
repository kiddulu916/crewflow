import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission, Permission } from '../utils/rbac';

const router = Router();
const companyController = new CompanyController();

// All routes require authentication
router.use(authenticate);

router.get('/', (req, res) => companyController.getCompany(req, res));

router.put('/', requirePermission(Permission.MANAGE_INTEGRATIONS), (req, res) =>
  companyController.updateCompany(req, res)
);

export default router;

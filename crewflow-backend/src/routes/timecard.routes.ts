import { Router } from 'express';
import { TimecardController } from '../controllers/timecard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission, Permission } from '../utils/rbac';

const router = Router();
const timecardController = new TimecardController();

// All routes require authentication
router.use(authenticate);

router.post('/', requirePermission(Permission.MANAGE_TIMECARDS), (req, res) =>
  timecardController.createTimecard(req, res)
);

router.get('/', (req, res) => timecardController.listTimecards(req, res));

router.get('/:id', (req, res) => timecardController.getTimecard(req, res));

router.put('/:id', requirePermission(Permission.MANAGE_TIMECARDS), (req, res) =>
  timecardController.updateTimecard(req, res)
);

router.delete('/:id', requirePermission(Permission.MANAGE_TIMECARDS), (req, res) =>
  timecardController.deleteTimecard(req, res)
);

export default router;

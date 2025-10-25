"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const timecard_controller_1 = require("../controllers/timecard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_1 = require("../utils/rbac");
const router = (0, express_1.Router)();
const timecardController = new timecard_controller_1.TimecardController();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
router.post('/', (0, rbac_1.requirePermission)(rbac_1.Permission.MANAGE_TIMECARDS), (req, res) => timecardController.createTimecard(req, res));
router.get('/', (req, res) => timecardController.listTimecards(req, res));
router.get('/:id', (req, res) => timecardController.getTimecard(req, res));
router.put('/:id', (0, rbac_1.requirePermission)(rbac_1.Permission.MANAGE_TIMECARDS), (req, res) => timecardController.updateTimecard(req, res));
router.delete('/:id', (0, rbac_1.requirePermission)(rbac_1.Permission.MANAGE_TIMECARDS), (req, res) => timecardController.deleteTimecard(req, res));
exports.default = router;
//# sourceMappingURL=timecard.routes.js.map
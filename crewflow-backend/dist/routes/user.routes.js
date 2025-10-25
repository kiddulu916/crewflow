"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_1 = require("../utils/rbac");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
router.post('/', (0, rbac_1.requirePermission)(rbac_1.Permission.MANAGE_USERS), (req, res) => userController.createUser(req, res));
router.get('/', (req, res) => userController.listUsers(req, res));
router.get('/:id', (req, res) => userController.getUser(req, res));
router.put('/:id', (0, rbac_1.requirePermission)(rbac_1.Permission.MANAGE_USERS), (req, res) => userController.updateUser(req, res));
router.delete('/:id', (0, rbac_1.requirePermission)(rbac_1.Permission.MANAGE_USERS), (req, res) => userController.deleteUser(req, res));
exports.default = router;
//# sourceMappingURL=user.routes.js.map
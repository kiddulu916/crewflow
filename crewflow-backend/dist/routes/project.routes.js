"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const project_controller_1 = require("../controllers/project.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_1 = require("../utils/rbac");
const router = (0, express_1.Router)();
const projectController = new project_controller_1.ProjectController();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
router.post('/', (0, rbac_1.requirePermission)(rbac_1.Permission.MANAGE_PROJECTS), (req, res) => projectController.createProject(req, res));
router.get('/', (req, res) => projectController.listProjects(req, res));
router.get('/:id', (req, res) => projectController.getProject(req, res));
router.put('/:id', (0, rbac_1.requirePermission)(rbac_1.Permission.MANAGE_PROJECTS), (req, res) => projectController.updateProject(req, res));
router.delete('/:id', (0, rbac_1.requirePermission)(rbac_1.Permission.MANAGE_PROJECTS), (req, res) => projectController.deleteProject(req, res));
exports.default = router;
//# sourceMappingURL=project.routes.js.map
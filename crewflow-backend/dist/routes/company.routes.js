"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("../controllers/company.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_1 = require("../utils/rbac");
const router = (0, express_1.Router)();
const companyController = new company_controller_1.CompanyController();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
router.get('/', (req, res) => companyController.getCompany(req, res));
router.put('/', (0, rbac_1.requirePermission)(rbac_1.Permission.MANAGE_INTEGRATIONS), (req, res) => companyController.updateCompany(req, res));
exports.default = router;
//# sourceMappingURL=company.routes.js.map
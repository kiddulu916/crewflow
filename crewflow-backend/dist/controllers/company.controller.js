"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
const company_service_1 = require("../services/company.service");
const errors_1 = require("../utils/errors");
const companyService = new company_service_1.CompanyService();
class CompanyController {
    async getCompany(req, res) {
        try {
            const company = await companyService.getCompany(req.user.companyId);
            return res.json(company);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async updateCompany(req, res) {
        try {
            const { name, subscriptionTier, settings } = req.body;
            const company = await companyService.updateCompany(req.user.companyId, {
                name,
                subscriptionTier,
                settings
            });
            return res.json(company);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.CompanyController = CompanyController;
//# sourceMappingURL=company.controller.js.map
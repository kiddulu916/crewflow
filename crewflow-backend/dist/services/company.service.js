"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const db_1 = __importDefault(require("../lib/db"));
const errors_1 = require("../utils/errors");
class CompanyService {
    async getCompany(id) {
        const company = await db_1.default.company.findFirst({
            where: {
                id,
                deletedAt: null
            }
        });
        if (!company) {
            throw new errors_1.NotFoundError('Company not found');
        }
        return company;
    }
    async updateCompany(id, data) {
        const company = await db_1.default.company.findFirst({
            where: {
                id,
                deletedAt: null
            }
        });
        if (!company) {
            throw new errors_1.NotFoundError('Company not found');
        }
        return await db_1.default.company.update({
            where: { id },
            data
        });
    }
}
exports.CompanyService = CompanyService;
//# sourceMappingURL=company.service.js.map
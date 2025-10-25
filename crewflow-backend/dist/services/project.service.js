"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const db_1 = __importDefault(require("../lib/db"));
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
class ProjectService {
    async createProject(data) {
        const project = await db_1.default.project.create({
            data: {
                companyId: data.companyId,
                name: data.name,
                projectNumber: data.projectNumber,
                clientName: data.clientName,
                address: data.address,
                latitude: data.latitude,
                longitude: data.longitude,
                geofenceRadius: data.geofenceRadius,
                status: data.status || client_1.ProjectStatus.ACTIVE,
                startDate: data.startDate,
                endDate: data.endDate,
                budgetHours: data.budgetHours,
                budgetAmount: data.budgetAmount,
                createdById: data.createdById
            }
        });
        return project;
    }
    async getProjectById(id, companyId) {
        const project = await db_1.default.project.findFirst({
            where: {
                id,
                companyId,
                deletedAt: null
            }
        });
        if (!project) {
            throw new errors_1.NotFoundError('Project not found');
        }
        return project;
    }
    async listProjects(companyId, filters) {
        const where = {
            companyId,
            deletedAt: null
        };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { projectNumber: { contains: filters.search, mode: 'insensitive' } },
                { clientName: { contains: filters.search, mode: 'insensitive' } }
            ];
        }
        const projects = await db_1.default.project.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return projects;
    }
    async updateProject(id, companyId, data) {
        const updated = await db_1.default.$transaction(async (tx) => {
            const project = await tx.project.findFirst({
                where: { id, companyId, deletedAt: null }
            });
            if (!project) {
                throw new errors_1.NotFoundError('Project not found');
            }
            return tx.project.update({
                where: { id },
                data
            });
        });
        return updated;
    }
    async deleteProject(id, companyId) {
        const project = await db_1.default.project.findFirst({
            where: { id, companyId, deletedAt: null }
        });
        if (!project) {
            throw new errors_1.NotFoundError('Project not found');
        }
        // Soft delete
        await db_1.default.project.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }
}
exports.ProjectService = ProjectService;
//# sourceMappingURL=project.service.js.map
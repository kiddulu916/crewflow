"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimecardService = void 0;
const db_1 = __importDefault(require("../lib/db"));
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
class TimecardService {
    async createTimecard(data) {
        // Use transaction for atomicity and validation
        const timecard = await db_1.default.$transaction(async (tx) => {
            // Validate project exists and belongs to company
            const project = await tx.project.findFirst({
                where: {
                    id: data.projectId,
                    companyId: data.companyId,
                    deletedAt: null
                }
            });
            if (!project) {
                throw new errors_1.ValidationError('Project not found or does not belong to company');
            }
            // Validate worker exists and belongs to company
            const worker = await tx.user.findFirst({
                where: {
                    id: data.workerId,
                    companyId: data.companyId,
                    deletedAt: null
                }
            });
            if (!worker) {
                throw new errors_1.ValidationError('Worker not found or does not belong to company');
            }
            // Validate cost code exists and belongs to company
            const costCode = await tx.costCode.findFirst({
                where: {
                    id: data.costCodeId,
                    companyId: data.companyId,
                    isActive: true
                }
            });
            if (!costCode) {
                throw new errors_1.ValidationError('Cost code not found or does not belong to company');
            }
            // Create timecard
            return tx.timecard.create({
                data: {
                    companyId: data.companyId,
                    workerId: data.workerId,
                    projectId: data.projectId,
                    costCodeId: data.costCodeId,
                    clockIn: data.clockIn,
                    clockInLatitude: data.clockInLatitude,
                    clockInLongitude: data.clockInLongitude,
                    clockInPhotoUrl: data.clockInPhotoUrl,
                    notes: data.notes,
                    status: data.status || client_1.TimecardStatus.DRAFT,
                    breakMinutes: 0
                }
            });
        });
        return timecard;
    }
    async getTimecardById(id, companyId) {
        const timecard = await db_1.default.timecard.findFirst({
            where: {
                id,
                companyId,
                deletedAt: null
            },
            include: {
                worker: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                costCode: {
                    select: {
                        id: true,
                        code: true,
                        description: true
                    }
                }
            }
        });
        return timecard;
    }
    async listTimecards(companyId, filters) {
        const where = {
            companyId,
            deletedAt: null
        };
        // Apply filters
        if (filters?.workerId) {
            where.workerId = filters.workerId;
        }
        if (filters?.projectId) {
            where.projectId = filters.projectId;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        // Date range filter
        if (filters?.startDate || filters?.endDate) {
            where.clockIn = {};
            if (filters.startDate) {
                where.clockIn.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.clockIn.lte = filters.endDate;
            }
        }
        const timecards = await db_1.default.timecard.findMany({
            where,
            include: {
                worker: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                costCode: {
                    select: {
                        id: true,
                        code: true,
                        description: true
                    }
                }
            },
            orderBy: { clockIn: 'desc' }
        });
        return timecards;
    }
    async updateTimecard(id, companyId, data) {
        const updated = await db_1.default.$transaction(async (tx) => {
            // Check timecard exists and belongs to company
            const timecard = await tx.timecard.findFirst({
                where: { id, companyId, deletedAt: null }
            });
            if (!timecard) {
                throw new errors_1.NotFoundError('Timecard not found');
            }
            // Update timecard
            return tx.timecard.update({
                where: { id },
                data
            });
        });
        return updated;
    }
    async deleteTimecard(id, companyId) {
        // Check timecard exists and belongs to company
        const timecard = await db_1.default.timecard.findFirst({
            where: { id, companyId, deletedAt: null }
        });
        if (!timecard) {
            throw new errors_1.NotFoundError('Timecard not found');
        }
        // Soft delete
        await db_1.default.timecard.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }
}
exports.TimecardService = TimecardService;
//# sourceMappingURL=timecard.service.js.map
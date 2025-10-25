"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const db_1 = __importDefault(require("../lib/db"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const errors_1 = require("../utils/errors");
class UserService {
    sanitizeUser(user) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }
    async createUser(data) {
        // Check if email already exists
        const existing = await db_1.default.user.findUnique({
            where: { email: data.email }
        });
        if (existing) {
            throw new errors_1.ConflictError('Email already exists');
        }
        // Hash password if provided
        let passwordHash = null;
        if (data.password) {
            passwordHash = await bcrypt_1.default.hash(data.password, 12);
        }
        const user = await db_1.default.user.create({
            data: {
                companyId: data.companyId,
                email: data.email,
                name: data.name,
                role: data.role,
                phoneNumber: data.phoneNumber,
                passwordHash,
                status: client_1.UserStatus.ACTIVE
            }
        });
        // Remove passwordHash from response
        return this.sanitizeUser(user);
    }
    async getUserById(id, companyId) {
        const user = await db_1.default.user.findFirst({
            where: {
                id,
                companyId,
                deletedAt: null
            }
        });
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        return this.sanitizeUser(user);
    }
    async listUsers(companyId, filters) {
        const where = {
            companyId,
            deletedAt: null
        };
        if (filters?.role) {
            where.role = filters.role;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } }
            ];
        }
        const users = await db_1.default.user.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return users.map(u => this.sanitizeUser(u));
    }
    async updateUser(id, companyId, data) {
        const updated = await db_1.default.$transaction(async (tx) => {
            const user = await tx.user.findFirst({
                where: { id, companyId, deletedAt: null }
            });
            if (!user) {
                throw new errors_1.NotFoundError('User not found');
            }
            return tx.user.update({
                where: { id },
                data
            });
        });
        return this.sanitizeUser(updated);
    }
    async deleteUser(id, companyId) {
        const user = await db_1.default.user.findFirst({
            where: { id, companyId, deletedAt: null }
        });
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Soft delete
        await db_1.default.user.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map
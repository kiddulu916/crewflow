import prisma from '../lib/db';
import { UserRole, UserStatus, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors';

export class UserService {
  private sanitizeUser<T extends { passwordHash?: string | null }>(user: T): Omit<T, 'passwordHash'> {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
  async createUser(data: {
    companyId: string;
    email: string;
    name: string;
    role: UserRole;
    phoneNumber?: string;
    password?: string;
  }) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw new ConflictError('Email already exists');
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 12);
    }

    const user = await prisma.user.create({
      data: {
        companyId: data.companyId,
        email: data.email,
        name: data.name,
        role: data.role,
        phoneNumber: data.phoneNumber,
        passwordHash,
        status: UserStatus.ACTIVE
      }
    });

    // Remove passwordHash from response
    return this.sanitizeUser(user);
  }

  async getUserById(id: string, companyId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.sanitizeUser(user);
  }

  async listUsers(companyId: string, filters?: {
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  }) {
    const where: Prisma.UserWhereInput = {
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

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return users.map(u => this.sanitizeUser(u));
  }

  async updateUser(id: string, companyId: string, data: {
    name?: string;
    phoneNumber?: string;
    role?: UserRole;
    status?: UserStatus;
  }) {
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id, companyId, deletedAt: null }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return tx.user.update({
        where: { id },
        data
      });
    });

    return this.sanitizeUser(updated);
  }

  async deleteUser(id: string, companyId: string) {
    const user = await prisma.user.findFirst({
      where: { id, companyId, deletedAt: null }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}

import prisma from '../lib/db';
import { TimecardStatus, Prisma } from '@prisma/client';
import { ValidationError, NotFoundError } from '../utils/errors';

export class TimecardService {
  async createTimecard(data: {
    companyId: string;
    workerId: string;
    projectId: string;
    costCodeId: string;
    clockIn: Date;
    clockInLatitude?: number;
    clockInLongitude?: number;
    clockInPhotoUrl?: string;
    notes?: string;
    status?: TimecardStatus;
  }) {
    // Use transaction for atomicity and validation
    const timecard = await prisma.$transaction(async (tx) => {
      // Validate project exists and belongs to company
      const project = await tx.project.findFirst({
        where: {
          id: data.projectId,
          companyId: data.companyId,
          deletedAt: null
        }
      });

      if (!project) {
        throw new ValidationError('Project not found or does not belong to company');
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
        throw new ValidationError('Worker not found or does not belong to company');
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
        throw new ValidationError('Cost code not found or does not belong to company');
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
          status: data.status || TimecardStatus.DRAFT,
          breakMinutes: 0
        }
      });
    });

    return timecard;
  }

  async getTimecardById(id: string, companyId: string) {
    const timecard = await prisma.timecard.findFirst({
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

  async listTimecards(companyId: string, filters?: {
    workerId?: string;
    projectId?: string;
    status?: TimecardStatus;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: Prisma.TimecardWhereInput = {
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

    const timecards = await prisma.timecard.findMany({
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

  async updateTimecard(id: string, companyId: string, data: {
    clockOut?: Date;
    clockOutLatitude?: number;
    clockOutLongitude?: number;
    clockOutPhotoUrl?: string;
    breakMinutes?: number;
    notes?: string;
    status?: TimecardStatus;
  }) {
    const updated = await prisma.$transaction(async (tx) => {
      // Check timecard exists and belongs to company
      const timecard = await tx.timecard.findFirst({
        where: { id, companyId, deletedAt: null }
      });

      if (!timecard) {
        throw new NotFoundError('Timecard not found');
      }

      // Update timecard
      return tx.timecard.update({
        where: { id },
        data
      });
    });

    return updated;
  }

  async deleteTimecard(id: string, companyId: string) {
    // Check timecard exists and belongs to company
    const timecard = await prisma.timecard.findFirst({
      where: { id, companyId, deletedAt: null }
    });

    if (!timecard) {
      throw new NotFoundError('Timecard not found');
    }

    // Soft delete
    await prisma.timecard.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}

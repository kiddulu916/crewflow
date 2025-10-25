import prisma from '../lib/db';
import { ProjectStatus, Prisma } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

export class ProjectService {
  async createProject(data: {
    companyId: string;
    name: string;
    projectNumber?: string;
    clientName?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    geofenceRadius?: number;
    status?: ProjectStatus;
    startDate?: Date;
    endDate?: Date;
    budgetHours?: number;
    budgetAmount?: number;
    createdById?: string;
  }) {
    const project = await prisma.project.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        projectNumber: data.projectNumber,
        clientName: data.clientName,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        geofenceRadius: data.geofenceRadius,
        status: data.status || ProjectStatus.ACTIVE,
        startDate: data.startDate,
        endDate: data.endDate,
        budgetHours: data.budgetHours,
        budgetAmount: data.budgetAmount,
        createdById: data.createdById
      }
    });

    return project;
  }

  async getProjectById(id: string, companyId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null
      }
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project;
  }

  async listProjects(companyId: string, filters?: {
    status?: ProjectStatus;
    search?: string;
  }) {
    const where: Prisma.ProjectWhereInput = {
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

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return projects;
  }

  async updateProject(id: string, companyId: string, data: {
    name?: string;
    projectNumber?: string;
    clientName?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    geofenceRadius?: number;
    status?: ProjectStatus;
    startDate?: Date;
    endDate?: Date;
    budgetHours?: number;
    budgetAmount?: number;
  }) {
    const updated = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id, companyId, deletedAt: null }
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      return tx.project.update({
        where: { id },
        data
      });
    });

    return updated;
  }

  async deleteProject(id: string, companyId: string) {
    const project = await prisma.project.findFirst({
      where: { id, companyId, deletedAt: null }
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Soft delete
    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}

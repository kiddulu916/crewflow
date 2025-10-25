import { Response } from 'express';
import { ProjectService } from '../services/project.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { ProjectStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { validateAndParseDate } from '../utils/validation';

const projectService = new ProjectService();

export class ProjectController {
  async createProject(req: AuthRequest, res: Response) {
    try {
      const {
        name,
        projectNumber,
        clientName,
        address,
        latitude,
        longitude,
        geofenceRadius,
        status,
        startDate,
        endDate,
        budgetHours,
        budgetAmount
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      const project = await projectService.createProject({
        companyId: req.user!.companyId,
        name,
        projectNumber,
        clientName,
        address,
        latitude,
        longitude,
        geofenceRadius,
        status: status as ProjectStatus | undefined,
        startDate: validateAndParseDate(startDate),
        endDate: validateAndParseDate(endDate),
        budgetHours,
        budgetAmount,
        createdById: req.user!.userId
      });

      return res.status(201).json(project);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProject(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const project = await projectService.getProjectById(id, req.user!.companyId);
      return res.json(project);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listProjects(req: AuthRequest, res: Response) {
    try {
      const { status, search } = req.query;

      const projects = await projectService.listProjects(req.user!.companyId, {
        status: status as ProjectStatus | undefined,
        search: search as string | undefined
      });

      return res.json(projects);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProject(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        projectNumber,
        clientName,
        address,
        latitude,
        longitude,
        geofenceRadius,
        status,
        startDate,
        endDate,
        budgetHours,
        budgetAmount
      } = req.body;

      const project = await projectService.updateProject(id, req.user!.companyId, {
        name,
        projectNumber,
        clientName,
        address,
        latitude,
        longitude,
        geofenceRadius,
        status: status as ProjectStatus | undefined,
        startDate: validateAndParseDate(startDate),
        endDate: validateAndParseDate(endDate),
        budgetHours,
        budgetAmount
      });

      return res.json(project);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProject(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await projectService.deleteProject(id, req.user!.companyId);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

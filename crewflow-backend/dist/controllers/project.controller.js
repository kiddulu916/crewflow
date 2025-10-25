"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const project_service_1 = require("../services/project.service");
const errors_1 = require("../utils/errors");
const validation_1 = require("../utils/validation");
const projectService = new project_service_1.ProjectService();
class ProjectController {
    async createProject(req, res) {
        try {
            const { name, projectNumber, clientName, address, latitude, longitude, geofenceRadius, status, startDate, endDate, budgetHours, budgetAmount } = req.body;
            if (!name) {
                return res.status(400).json({ error: 'Project name is required' });
            }
            const project = await projectService.createProject({
                companyId: req.user.companyId,
                name,
                projectNumber,
                clientName,
                address,
                latitude,
                longitude,
                geofenceRadius,
                status: status,
                startDate: (0, validation_1.validateAndParseDate)(startDate),
                endDate: (0, validation_1.validateAndParseDate)(endDate),
                budgetHours,
                budgetAmount,
                createdById: req.user.userId
            });
            return res.status(201).json(project);
        }
        catch (error) {
            if (error instanceof errors_1.ValidationError) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getProject(req, res) {
        try {
            const { id } = req.params;
            const project = await projectService.getProjectById(id, req.user.companyId);
            return res.json(project);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async listProjects(req, res) {
        try {
            const { status, search } = req.query;
            const projects = await projectService.listProjects(req.user.companyId, {
                status: status,
                search: search
            });
            return res.json(projects);
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async updateProject(req, res) {
        try {
            const { id } = req.params;
            const { name, projectNumber, clientName, address, latitude, longitude, geofenceRadius, status, startDate, endDate, budgetHours, budgetAmount } = req.body;
            const project = await projectService.updateProject(id, req.user.companyId, {
                name,
                projectNumber,
                clientName,
                address,
                latitude,
                longitude,
                geofenceRadius,
                status: status,
                startDate: (0, validation_1.validateAndParseDate)(startDate),
                endDate: (0, validation_1.validateAndParseDate)(endDate),
                budgetHours,
                budgetAmount
            });
            return res.json(project);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                return res.status(404).json({ error: error.message });
            }
            if (error instanceof errors_1.ValidationError) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async deleteProject(req, res) {
        try {
            const { id } = req.params;
            await projectService.deleteProject(id, req.user.companyId);
            return res.status(204).send();
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.ProjectController = ProjectController;
//# sourceMappingURL=project.controller.js.map
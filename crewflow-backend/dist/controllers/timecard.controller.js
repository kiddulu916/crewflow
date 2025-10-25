"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimecardController = void 0;
const timecard_service_1 = require("../services/timecard.service");
const errors_1 = require("../utils/errors");
const validation_1 = require("../utils/validation");
const timecardService = new timecard_service_1.TimecardService();
class TimecardController {
    async createTimecard(req, res) {
        try {
            const { workerId, projectId, costCodeId, clockIn, clockInLatitude, clockInLongitude, clockInPhotoUrl, notes, status } = req.body;
            // Validate required fields
            if (!workerId || !projectId || !costCodeId || !clockIn) {
                return res.status(400).json({
                    error: 'Required fields: workerId, projectId, costCodeId, clockIn'
                });
            }
            const timecard = await timecardService.createTimecard({
                companyId: req.user.companyId,
                workerId,
                projectId,
                costCodeId,
                clockIn: new Date(clockIn),
                clockInLatitude,
                clockInLongitude,
                clockInPhotoUrl,
                notes,
                status: status
            });
            return res.status(201).json(timecard);
        }
        catch (error) {
            if (error instanceof errors_1.ValidationError) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getTimecard(req, res) {
        try {
            const { id } = req.params;
            const timecard = await timecardService.getTimecardById(id, req.user.companyId);
            if (!timecard) {
                return res.status(404).json({ error: 'Timecard not found' });
            }
            return res.json(timecard);
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async listTimecards(req, res) {
        try {
            const { workerId, projectId, status, startDate, endDate } = req.query;
            const timecards = await timecardService.listTimecards(req.user.companyId, {
                workerId: workerId,
                projectId: projectId,
                status: status,
                startDate: (0, validation_1.validateAndParseDate)(startDate),
                endDate: (0, validation_1.validateAndParseDate)(endDate)
            });
            return res.json(timecards);
        }
        catch (error) {
            if (error instanceof errors_1.ValidationError) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async updateTimecard(req, res) {
        try {
            const { id } = req.params;
            const { clockOut, clockOutLatitude, clockOutLongitude, clockOutPhotoUrl, breakMinutes, notes, status } = req.body;
            const timecard = await timecardService.updateTimecard(id, req.user.companyId, {
                clockOut: clockOut ? new Date(clockOut) : undefined,
                clockOutLatitude,
                clockOutLongitude,
                clockOutPhotoUrl,
                breakMinutes,
                notes,
                status: status
            });
            return res.json(timecard);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async deleteTimecard(req, res) {
        try {
            const { id } = req.params;
            await timecardService.deleteTimecard(id, req.user.companyId);
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
exports.TimecardController = TimecardController;
//# sourceMappingURL=timecard.controller.js.map
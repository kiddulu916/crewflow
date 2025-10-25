import { Response } from 'express';
import { TimecardService } from '../services/timecard.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { TimecardStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { validateAndParseDate } from '../utils/validation';

const timecardService = new TimecardService();

export class TimecardController {
  async createTimecard(req: AuthRequest, res: Response) {
    try {
      const {
        workerId,
        projectId,
        costCodeId,
        clockIn,
        clockInLatitude,
        clockInLongitude,
        clockInPhotoUrl,
        notes,
        status
      } = req.body;

      // Validate required fields
      if (!workerId || !projectId || !costCodeId || !clockIn) {
        return res.status(400).json({
          error: 'Required fields: workerId, projectId, costCodeId, clockIn'
        });
      }

      const timecard = await timecardService.createTimecard({
        companyId: req.user!.companyId,
        workerId,
        projectId,
        costCodeId,
        clockIn: new Date(clockIn),
        clockInLatitude,
        clockInLongitude,
        clockInPhotoUrl,
        notes,
        status: status as TimecardStatus | undefined
      });

      return res.status(201).json(timecard);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTimecard(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const timecard = await timecardService.getTimecardById(id, req.user!.companyId);

      if (!timecard) {
        return res.status(404).json({ error: 'Timecard not found' });
      }

      return res.json(timecard);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listTimecards(req: AuthRequest, res: Response) {
    try {
      const { workerId, projectId, status, startDate, endDate } = req.query;

      const timecards = await timecardService.listTimecards(req.user!.companyId, {
        workerId: workerId as string | undefined,
        projectId: projectId as string | undefined,
        status: status as TimecardStatus | undefined,
        startDate: validateAndParseDate(startDate as string | undefined),
        endDate: validateAndParseDate(endDate as string | undefined)
      });

      return res.json(timecards);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateTimecard(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        clockOut,
        clockOutLatitude,
        clockOutLongitude,
        clockOutPhotoUrl,
        breakMinutes,
        notes,
        status
      } = req.body;

      const timecard = await timecardService.updateTimecard(id, req.user!.companyId, {
        clockOut: clockOut ? new Date(clockOut) : undefined,
        clockOutLatitude,
        clockOutLongitude,
        clockOutPhotoUrl,
        breakMinutes,
        notes,
        status: status as TimecardStatus | undefined
      });

      return res.json(timecard);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteTimecard(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await timecardService.deleteTimecard(id, req.user!.companyId);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

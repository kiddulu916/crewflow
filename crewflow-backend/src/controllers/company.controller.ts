import { Response } from 'express';
import { CompanyService } from '../services/company.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';

const companyService = new CompanyService();

export class CompanyController {
  async getCompany(req: AuthRequest, res: Response) {
    try {
      const company = await companyService.getCompany(req.user!.companyId);
      return res.json(company);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateCompany(req: AuthRequest, res: Response) {
    try {
      const { name, subscriptionTier, settings } = req.body;

      const company = await companyService.updateCompany(req.user!.companyId, {
        name,
        subscriptionTier,
        settings
      });

      return res.json(company);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

import prisma from '../lib/db';
import { NotFoundError } from '../utils/errors';

export class CompanyService {
  async getCompany(id: string) {
    const company = await prisma.company.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return company;
  }

  async updateCompany(id: string, data: {
    name?: string;
    subscriptionTier?: string;
    settings?: any;
  }) {
    const company = await prisma.company.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return await prisma.company.update({
      where: { id },
      data
    });
  }
}

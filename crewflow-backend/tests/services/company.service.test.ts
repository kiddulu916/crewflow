import { CompanyService } from '../../src/services/company.service';
import prisma from '../../src/lib/db';

describe('CompanyService', () => {
  let companyService: CompanyService;
  let testCompanyId: string;

  beforeAll(async () => {
    companyService = new CompanyService();
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        subscriptionTier: 'standard',
        settings: {}
      }
    });
    testCompanyId = company.id;
  });

  afterAll(async () => {
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('getCompany', () => {
    it('should get company by id', async () => {
      const company = await companyService.getCompany(testCompanyId);

      expect(company.id).toBe(testCompanyId);
      expect(company.name).toBe('Test Company');
      expect(company.subscriptionTier).toBe('standard');
      expect(company.settings).toEqual({});
    });

    it('should throw error for non-existent company', async () => {
      await expect(
        companyService.getCompany('non-existent-id')
      ).rejects.toThrow('Company not found');
    });

    it('should throw error for deleted company', async () => {
      const deletedCompany = await prisma.company.create({
        data: {
          name: 'Deleted Company',
          deletedAt: new Date()
        }
      });

      await expect(
        companyService.getCompany(deletedCompany.id)
      ).rejects.toThrow('Company not found');

      // Cleanup
      await prisma.company.delete({ where: { id: deletedCompany.id } });
    });
  });

  describe('updateCompany', () => {
    it('should update company name', async () => {
      const updated = await companyService.updateCompany(testCompanyId, {
        name: 'Updated Company Name'
      });

      expect(updated.name).toBe('Updated Company Name');
      expect(updated.id).toBe(testCompanyId);
    });

    it('should update company settings', async () => {
      const newSettings = { theme: 'dark', notifications: true };
      const updated = await companyService.updateCompany(testCompanyId, {
        settings: newSettings
      });

      expect(updated.settings).toEqual(newSettings);
    });

    it('should throw error for non-existent company', async () => {
      await expect(
        companyService.updateCompany('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('Company not found');
    });

    it('should throw error for deleted company', async () => {
      const deletedCompany = await prisma.company.create({
        data: {
          name: 'Deleted Company',
          deletedAt: new Date()
        }
      });

      await expect(
        companyService.updateCompany(deletedCompany.id, { name: 'Test' })
      ).rejects.toThrow('Company not found');

      // Cleanup
      await prisma.company.delete({ where: { id: deletedCompany.id } });
    });
  });
});

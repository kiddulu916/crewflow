import request from 'supertest';
import app from '../../src/index';
import prisma from '../../src/lib/db';
import bcrypt from 'bcrypt';
import { AuthService } from '../../src/services/auth.service';

describe('Company API', () => {
  let testCompanyId: string;
  let ownerUserId: string;
  let ownerToken: string;
  let adminUserId: string;
  let adminToken: string;
  let fieldWorkerUserId: string;
  let fieldWorkerToken: string;

  beforeAll(async () => {
    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        subscriptionTier: 'standard',
        settings: { theme: 'light' }
      }
    });
    testCompanyId = company.id;

    // Create OWNER user
    const ownerPasswordHash = await bcrypt.hash('password123', 12);
    const owner = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'company-owner@test.com',
        passwordHash: ownerPasswordHash,
        name: 'Owner User',
        role: 'OWNER'
      }
    });
    ownerUserId = owner.id;

    // Get owner access token
    const authService = new AuthService();
    const ownerResult = await authService.login('company-owner@test.com', 'password123');
    ownerToken = ownerResult.accessToken;

    // Create ADMIN user
    const adminPasswordHash = await bcrypt.hash('password123', 12);
    const admin = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'company-admin@test.com',
        passwordHash: adminPasswordHash,
        name: 'Admin User',
        role: 'ADMIN'
      }
    });
    adminUserId = admin.id;

    // Get admin access token
    const adminResult = await authService.login('company-admin@test.com', 'password123');
    adminToken = adminResult.accessToken;

    // Create FIELD_WORKER user
    const workerPasswordHash = await bcrypt.hash('password123', 12);
    const worker = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'company-worker@test.com',
        passwordHash: workerPasswordHash,
        name: 'Field Worker',
        role: 'FIELD_WORKER'
      }
    });
    fieldWorkerUserId = worker.id;

    // Get field worker token
    const workerResult = await authService.login('company-worker@test.com', 'password123');
    fieldWorkerToken = workerResult.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('GET /api/v1/company', () => {
    it('should get company details', async () => {
      const response = await request(app)
        .get('/api/v1/company')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testCompanyId);
      expect(response.body.name).toBe('Test Company');
      expect(response.body.subscriptionTier).toBe('standard');
      expect(response.body.settings).toEqual({ theme: 'light' });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/company');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/company', () => {
    it('should update company name with OWNER role', async () => {
      const response = await request(app)
        .put('/api/v1/company')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Updated Company Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Company Name');

      // Reset company name
      await prisma.company.update({
        where: { id: testCompanyId },
        data: { name: 'Test Company' }
      });
    });

    it('should update company settings with OWNER role', async () => {
      const newSettings = { theme: 'dark', notifications: true };
      const response = await request(app)
        .put('/api/v1/company')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          settings: newSettings
        });

      expect(response.status).toBe(200);
      expect(response.body.settings).toEqual(newSettings);

      // Reset settings
      await prisma.company.update({
        where: { id: testCompanyId },
        data: { settings: { theme: 'light' } }
      });
    });

    it('should update company with ADMIN role (has MANAGE_INTEGRATIONS)', async () => {
      const response = await request(app)
        .put('/api/v1/company')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Updated Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Admin Updated Name');

      // Reset company name
      await prisma.company.update({
        where: { id: testCompanyId },
        data: { name: 'Test Company' }
      });
    });

    it('should return 403 for user without MANAGE_INTEGRATIONS permission', async () => {
      const response = await request(app)
        .put('/api/v1/company')
        .set('Authorization', `Bearer ${fieldWorkerToken}`)
        .send({
          name: 'Unauthorized Update'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/v1/company')
        .send({
          name: 'Test'
        });

      expect(response.status).toBe(401);
    });
  });
});

import request from 'supertest';
import app from '../../src/index';
import prisma from '../../src/lib/db';
import bcrypt from 'bcrypt';
import { AuthService } from '../../src/services/auth.service';
import { TimecardStatus } from '@prisma/client';

describe('Timecard API', () => {
  let testCompanyId: string;
  let ownerUserId: string;
  let ownerToken: string;
  let projectManagerUserId: string;
  let projectManagerToken: string;
  let fieldWorkerUserId: string;
  let fieldWorkerToken: string;
  let testProjectId: string;
  let testCostCodeId: string;

  beforeAll(async () => {
    // Create test company
    const company = await prisma.company.create({
      data: { name: 'Test Company Timecards' }
    });
    testCompanyId = company.id;

    // Create OWNER user
    const ownerPasswordHash = await bcrypt.hash('password123', 12);
    const owner = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'owner-tc@test.com',
        passwordHash: ownerPasswordHash,
        name: 'Owner User',
        role: 'OWNER'
      }
    });
    ownerUserId = owner.id;

    // Create PROJECT_MANAGER user
    const pmPasswordHash = await bcrypt.hash('password123', 12);
    const pm = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'pm-tc@test.com',
        passwordHash: pmPasswordHash,
        name: 'Project Manager',
        role: 'PROJECT_MANAGER'
      }
    });
    projectManagerUserId = pm.id;

    // Create FIELD_WORKER user
    const workerPasswordHash = await bcrypt.hash('password123', 12);
    const worker = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'worker-tc@test.com',
        passwordHash: workerPasswordHash,
        name: 'Field Worker',
        role: 'FIELD_WORKER'
      }
    });
    fieldWorkerUserId = worker.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        companyId: testCompanyId,
        name: 'Test Project',
        status: 'ACTIVE'
      }
    });
    testProjectId = project.id;

    // Create test cost code
    const costCode = await prisma.costCode.create({
      data: {
        companyId: testCompanyId,
        code: 'LAB-001',
        description: 'General Labor',
        category: 'LABOR'
      }
    });
    testCostCodeId = costCode.id;

    // Get access tokens
    const authService = new AuthService();
    const ownerResult = await authService.login('owner-tc@test.com', 'password123');
    ownerToken = ownerResult.accessToken;

    const pmResult = await authService.login('pm-tc@test.com', 'password123');
    projectManagerToken = pmResult.accessToken;

    const workerResult = await authService.login('worker-tc@test.com', 'password123');
    fieldWorkerToken = workerResult.accessToken;
  });

  afterAll(async () => {
    await prisma.timecard.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.costCode.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.project.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/timecards', () => {
    it('should create a new timecard with OWNER role', async () => {
      const response = await request(app)
        .post('/api/v1/timecards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          workerId: fieldWorkerUserId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date().toISOString(),
          clockInLatitude: 40.7128,
          clockInLongitude: -74.0060
        });

      expect(response.status).toBe(201);
      expect(response.body.workerId).toBe(fieldWorkerUserId);
      expect(response.body.projectId).toBe(testProjectId);
      expect(response.body.status).toBe(TimecardStatus.DRAFT);

      // Cleanup
      await prisma.timecard.delete({ where: { id: response.body.id } });
    });

    it('should create a new timecard with PROJECT_MANAGER role', async () => {
      const response = await request(app)
        .post('/api/v1/timecards')
        .set('Authorization', `Bearer ${projectManagerToken}`)
        .send({
          workerId: fieldWorkerUserId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date().toISOString(),
          clockInLatitude: 40.7128,
          clockInLongitude: -74.0060
        });

      expect(response.status).toBe(201);
      expect(response.body.workerId).toBe(fieldWorkerUserId);

      // Cleanup
      await prisma.timecard.delete({ where: { id: response.body.id } });
    });

    it('should return 403 when FIELD_WORKER tries to create timecard', async () => {
      const response = await request(app)
        .post('/api/v1/timecards')
        .set('Authorization', `Bearer ${fieldWorkerToken}`)
        .send({
          workerId: fieldWorkerUserId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date().toISOString(),
          clockInLatitude: 40.7128,
          clockInLongitude: -74.0060
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/timecards')
        .send({
          workerId: fieldWorkerUserId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date().toISOString()
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/timecards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          projectId: testProjectId
          // Missing workerId, costCodeId, clockIn
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/timecards', () => {
    let timecardId1: string;
    let timecardId2: string;

    beforeAll(async () => {
      // Create test timecards with current date
      const today = new Date();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const tc1 = await prisma.timecard.create({
        data: {
          companyId: testCompanyId,
          workerId: fieldWorkerUserId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: today,
          clockInLatitude: 40.7128,
          clockInLongitude: -74.0060,
          status: TimecardStatus.DRAFT
        }
      });
      timecardId1 = tc1.id;

      const tc2 = await prisma.timecard.create({
        data: {
          companyId: testCompanyId,
          workerId: fieldWorkerUserId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: tomorrow,
          clockInLatitude: 40.7128,
          clockInLongitude: -74.0060,
          status: TimecardStatus.APPROVED
        }
      });
      timecardId2 = tc2.id;
    });

    afterAll(async () => {
      await prisma.timecard.deleteMany({
        where: { id: { in: [timecardId1, timecardId2] } }
      });
    });

    it('should list all timecards', async () => {
      const response = await request(app)
        .get('/api/v1/timecards')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      // Verify the specific timecards we created are present
      const timecardIds = response.body.map((tc: any) => tc.id);
      expect(timecardIds).toContain(timecardId1);
      expect(timecardIds).toContain(timecardId2);
    });

    it('should filter timecards by workerId', async () => {
      const response = await request(app)
        .get(`/api/v1/timecards?workerId=${fieldWorkerUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.every((tc: any) => tc.workerId === fieldWorkerUserId)).toBe(true);
    });

    it('should filter timecards by projectId', async () => {
      const response = await request(app)
        .get(`/api/v1/timecards?projectId=${testProjectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.every((tc: any) => tc.projectId === testProjectId)).toBe(true);
    });

    it('should filter timecards by status', async () => {
      const response = await request(app)
        .get(`/api/v1/timecards?status=${TimecardStatus.APPROVED}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.every((tc: any) => tc.status === TimecardStatus.APPROVED)).toBe(true);
    });

    it('should filter timecards by date range', async () => {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/v1/timecards?startDate=${today}&endDate=${tomorrow}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/timecards/:id', () => {
    let timecardId: string;

    beforeAll(async () => {
      const tc = await prisma.timecard.create({
        data: {
          companyId: testCompanyId,
          workerId: fieldWorkerUserId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date(),
          clockInLatitude: 40.7128,
          clockInLongitude: -74.0060,
          status: TimecardStatus.DRAFT
        }
      });
      timecardId = tc.id;
    });

    afterAll(async () => {
      await prisma.timecard.delete({ where: { id: timecardId } });
    });

    it('should get timecard by id', async () => {
      const response = await request(app)
        .get(`/api/v1/timecards/${timecardId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(timecardId);
      expect(response.body.worker).toBeDefined();
      expect(response.body.project).toBeDefined();
      expect(response.body.costCode).toBeDefined();
    });

    it('should return 404 for non-existent timecard', async () => {
      const response = await request(app)
        .get('/api/v1/timecards/non-existent-id')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/timecards/:id', () => {
    let timecardId: string;

    beforeEach(async () => {
      const tc = await prisma.timecard.create({
        data: {
          companyId: testCompanyId,
          workerId: fieldWorkerUserId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date(),
          clockInLatitude: 40.7128,
          clockInLongitude: -74.0060,
          status: TimecardStatus.DRAFT
        }
      });
      timecardId = tc.id;
    });

    afterEach(async () => {
      await prisma.timecard.deleteMany({ where: { id: timecardId } });
    });

    it('should update timecard with OWNER role', async () => {
      const clockOut = new Date();
      const response = await request(app)
        .put(`/api/v1/timecards/${timecardId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          clockOut: clockOut.toISOString(),
          clockOutLatitude: 40.7128,
          clockOutLongitude: -74.0060,
          breakMinutes: 30,
          notes: 'Test notes',
          status: TimecardStatus.APPROVED
        });

      expect(response.status).toBe(200);
      expect(response.body.breakMinutes).toBe(30);
      expect(response.body.notes).toBe('Test notes');
      expect(response.body.status).toBe(TimecardStatus.APPROVED);
    });

    it('should update timecard with PROJECT_MANAGER role', async () => {
      const response = await request(app)
        .put(`/api/v1/timecards/${timecardId}`)
        .set('Authorization', `Bearer ${projectManagerToken}`)
        .send({
          status: TimecardStatus.APPROVED
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(TimecardStatus.APPROVED);
    });

    it('should return 403 when FIELD_WORKER tries to update timecard', async () => {
      const response = await request(app)
        .put(`/api/v1/timecards/${timecardId}`)
        .set('Authorization', `Bearer ${fieldWorkerToken}`)
        .send({
          notes: 'Worker notes'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 404 for non-existent timecard', async () => {
      const response = await request(app)
        .put('/api/v1/timecards/non-existent-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          notes: 'Test'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/timecards/:id', () => {
    let timecardId: string;

    beforeEach(async () => {
      const tc = await prisma.timecard.create({
        data: {
          companyId: testCompanyId,
          workerId: fieldWorkerUserId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date(),
          clockInLatitude: 40.7128,
          clockInLongitude: -74.0060,
          status: TimecardStatus.DRAFT
        }
      });
      timecardId = tc.id;
    });

    afterEach(async () => {
      await prisma.timecard.deleteMany({ where: { id: timecardId } });
    });

    it('should soft delete timecard with OWNER role', async () => {
      const response = await request(app)
        .delete(`/api/v1/timecards/${timecardId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(204);

      // Verify soft delete
      const deleted = await prisma.timecard.findUnique({
        where: { id: timecardId }
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('should soft delete timecard with PROJECT_MANAGER role', async () => {
      const response = await request(app)
        .delete(`/api/v1/timecards/${timecardId}`)
        .set('Authorization', `Bearer ${projectManagerToken}`);

      expect(response.status).toBe(204);
    });

    it('should return 403 when FIELD_WORKER tries to delete timecard', async () => {
      const response = await request(app)
        .delete(`/api/v1/timecards/${timecardId}`)
        .set('Authorization', `Bearer ${fieldWorkerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 404 for non-existent timecard', async () => {
      const response = await request(app)
        .delete('/api/v1/timecards/non-existent-id')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });
  });
});

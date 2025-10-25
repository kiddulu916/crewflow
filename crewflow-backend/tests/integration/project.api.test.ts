import request from 'supertest';
import app from '../../src/index';
import prisma from '../../src/lib/db';
import bcrypt from 'bcrypt';
import { AuthService } from '../../src/services/auth.service';
import { ProjectStatus } from '@prisma/client';

describe('Project API', () => {
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
      data: { name: 'Test Company Projects' }
    });
    testCompanyId = company.id;

    // Create owner user
    const ownerPasswordHash = await bcrypt.hash('password123', 12);
    const owner = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'owner@test.com',
        passwordHash: ownerPasswordHash,
        name: 'Owner User',
        role: 'OWNER'
      }
    });
    ownerUserId = owner.id;

    // Create admin user
    const adminPasswordHash = await bcrypt.hash('password123', 12);
    const admin = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'admin@test.com',
        passwordHash: adminPasswordHash,
        name: 'Admin User',
        role: 'ADMIN'
      }
    });
    adminUserId = admin.id;

    // Create field worker user
    const fieldWorkerPasswordHash = await bcrypt.hash('password123', 12);
    const fieldWorker = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'fieldworker@test.com',
        passwordHash: fieldWorkerPasswordHash,
        name: 'Field Worker',
        role: 'FIELD_WORKER'
      }
    });
    fieldWorkerUserId = fieldWorker.id;

    // Get access tokens
    const authService = new AuthService();
    const ownerResult = await authService.login('owner@test.com', 'password123');
    ownerToken = ownerResult.accessToken;

    const adminResult = await authService.login('admin@test.com', 'password123');
    adminToken = adminResult.accessToken;

    const workerResult = await authService.login('fieldworker@test.com', 'password123');
    fieldWorkerToken = workerResult.accessToken;
  });

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project with OWNER role', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Test Project 1',
          projectNumber: 'PRJ-001',
          clientName: 'Test Client',
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.0060,
          geofenceRadius: 100,
          status: 'ACTIVE',
          budgetHours: 1000,
          budgetAmount: 50000
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Project 1');
      expect(response.body.projectNumber).toBe('PRJ-001');
      expect(response.body.companyId).toBe(testCompanyId);

      // Cleanup
      await prisma.project.delete({ where: { id: response.body.id } });
    });

    it('should create a new project with ADMIN role (has MANAGE_PROJECTS)', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Project 2',
          projectNumber: 'PRJ-002',
          clientName: 'Another Client'
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Project 2');
      expect(response.body.companyId).toBe(testCompanyId);

      // Cleanup
      await prisma.project.delete({ where: { id: response.body.id } });
    });

    it('should return 403 for FIELD_WORKER role (no MANAGE_PROJECTS permission)', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${fieldWorkerToken}`)
        .send({
          name: 'Test Project 3',
          projectNumber: 'PRJ-003'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          name: 'Test Project 4',
          projectNumber: 'PRJ-004'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/projects', () => {
    let testProjectId: string;

    beforeEach(async () => {
      // Create a test project
      const project = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Test Project List',
          projectNumber: 'PRJ-LIST-001',
          status: ProjectStatus.ACTIVE
        }
      });
      testProjectId = project.id;
    });

    afterEach(async () => {
      await prisma.project.deleteMany({ where: { id: testProjectId } });
    });

    it('should list all projects for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('companyId');
    });

    it('should filter projects by status', async () => {
      const response = await request(app)
        .get('/api/v1/projects?status=ACTIVE')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((project: any) => {
        expect(project.status).toBe('ACTIVE');
      });
    });

    it('should search projects by name', async () => {
      const response = await request(app)
        .get('/api/v1/projects?search=Test Project List')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    let testProjectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Test Project Get',
          projectNumber: 'PRJ-GET-001'
        }
      });
      testProjectId = project.id;
    });

    afterEach(async () => {
      await prisma.project.deleteMany({ where: { id: testProjectId } });
    });

    it('should get project by id', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testProjectId);
      expect(response.body.name).toBe('Test Project Get');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/v1/projects/non-existent-id')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    let testProjectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Test Project Update',
          projectNumber: 'PRJ-UPDATE-001'
        }
      });
      testProjectId = project.id;
    });

    afterEach(async () => {
      await prisma.project.deleteMany({ where: { id: testProjectId } });
    });

    it('should update project with OWNER role', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Updated Project Name',
          status: 'COMPLETED'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Project Name');
      expect(response.body.status).toBe('COMPLETED');
    });

    it('should return 403 for FIELD_WORKER role (no MANAGE_PROJECTS permission)', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${fieldWorkerToken}`)
        .send({
          name: 'Should Not Update'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    let testProjectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Test Project Delete',
          projectNumber: 'PRJ-DELETE-001'
        }
      });
      testProjectId = project.id;
    });

    afterEach(async () => {
      await prisma.project.deleteMany({ where: { id: testProjectId } });
    });

    it('should soft delete project with OWNER role', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(204);

      // Verify soft delete
      const deleted = await prisma.project.findUnique({
        where: { id: testProjectId }
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('should return 403 for FIELD_WORKER role (no MANAGE_PROJECTS permission)', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${fieldWorkerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });
});

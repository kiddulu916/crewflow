import request from 'supertest';
import app from '../../src/index';
import prisma from '../../src/lib/db';
import bcrypt from 'bcrypt';
import { AuthService } from '../../src/services/auth.service';

describe('User API', () => {
  let testCompanyId: string;
  let adminUserId: string;
  let accessToken: string;
  let fieldWorkerUserId: string;
  let fieldWorkerToken: string;

  beforeAll(async () => {
    // Create test company
    const company = await prisma.company.create({
      data: { name: 'Test Company' }
    });
    testCompanyId = company.id;

    // Create admin user
    const passwordHash = await bcrypt.hash('password123', 12);
    const admin = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'admin@test.com',
        passwordHash,
        name: 'Admin User',
        role: 'ADMIN'
      }
    });
    adminUserId = admin.id;

    // Get access token
    const authService = new AuthService();
    const result = await authService.login('admin@test.com', 'password123');
    accessToken = result.accessToken;

    // Create field worker user
    const fieldWorkerPasswordHash = await bcrypt.hash('password123', 12);
    const fieldWorker = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'worker@test.com',
        passwordHash: fieldWorkerPasswordHash,
        name: 'Field Worker',
        role: 'FIELD_WORKER'
      }
    });
    fieldWorkerUserId = fieldWorker.id;

    // Get field worker token
    const workerResult = await authService.login('worker@test.com', 'password123');
    fieldWorkerToken = workerResult.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'newuser@test.com',
          name: 'New User',
          role: 'FIELD_WORKER',
          phoneNumber: '555-1234'
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('newuser@test.com');
      expect(response.body.name).toBe('New User');
      expect(response.body).not.toHaveProperty('passwordHash');

      // Cleanup
      await prisma.user.delete({ where: { id: response.body.id } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({
          email: 'test@test.com',
          name: 'Test',
          role: 'FIELD_WORKER'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'incomplete@test.com'
        });

      expect(response.status).toBe(400);
    });

    it('should return 409 for duplicate email', async () => {
      const user = await prisma.user.create({
        data: {
          companyId: testCompanyId,
          email: 'duplicate@test.com',
          name: 'Duplicate User',
          role: 'FIELD_WORKER'
        }
      });

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'duplicate@test.com',
          name: 'Another User',
          role: 'FIELD_WORKER'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Email already exists');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should return 403 for user without MANAGE_USERS permission', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${fieldWorkerToken}`)
        .send({
          email: 'test@test.com',
          name: 'Test',
          role: 'FIELD_WORKER'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('GET /api/v1/users', () => {
    it('should list all users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/users');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should get user by id', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${adminUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(adminUserId);
      expect(response.body.email).toBe('admin@test.com');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${adminUserId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should update user', async () => {
      const user = await prisma.user.create({
        data: {
          companyId: testCompanyId,
          email: 'toupdate@test.com',
          name: 'Original Name',
          role: 'FIELD_WORKER'
        }
      });

      const response = await request(app)
        .put(`/api/v1/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
          phoneNumber: '555-9999'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.phoneNumber).toBe('555-9999');
      expect(response.body).not.toHaveProperty('passwordHash');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put(`/api/v1/users/${adminUserId}`)
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 for user without MANAGE_USERS permission', async () => {
      const user = await prisma.user.create({
        data: {
          companyId: testCompanyId,
          email: 'toupdate2@test.com',
          name: 'Original Name',
          role: 'FIELD_WORKER'
        }
      });

      const response = await request(app)
        .put(`/api/v1/users/${user.id}`)
        .set('Authorization', `Bearer ${fieldWorkerToken}`)
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete user (soft delete)', async () => {
      const user = await prisma.user.create({
        data: {
          companyId: testCompanyId,
          email: 'todelete@test.com',
          name: 'To Delete',
          role: 'FIELD_WORKER'
        }
      });

      const response = await request(app)
        .delete(`/api/v1/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);

      // Verify soft delete
      const deleted = await prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(deleted?.deletedAt).not.toBeNull();

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${adminUserId}`);

      expect(response.status).toBe(401);
    });

    it('should return 403 for user without MANAGE_USERS permission', async () => {
      const user = await prisma.user.create({
        data: {
          companyId: testCompanyId,
          email: 'todelete2@test.com',
          name: 'To Delete',
          role: 'FIELD_WORKER'
        }
      });

      const response = await request(app)
        .delete(`/api/v1/users/${user.id}`)
        .set('Authorization', `Bearer ${fieldWorkerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});

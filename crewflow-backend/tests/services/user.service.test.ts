import { UserService } from '../../src/services/user.service';
import prisma from '../../src/lib/db';
import { UserRole, UserStatus } from '@prisma/client';

describe('UserService', () => {
  let userService: UserService;
  let testCompanyId: string;

  beforeAll(async () => {
    userService = new UserService();
    const company = await prisma.company.create({
      data: { name: 'Test Company' }
    });
    testCompanyId = company.id;
  });

  afterAll(async () => {
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        companyId: testCompanyId,
        email: 'newuser@test.com',
        name: 'New User',
        role: UserRole.FIELD_WORKER,
        phoneNumber: '555-1234'
      };

      const user = await userService.createUser(userData);

      expect(user.email).toBe('newuser@test.com');
      expect(user.name).toBe('New User');
      expect(user.role).toBe(UserRole.FIELD_WORKER);
      expect(user).not.toHaveProperty('passwordHash');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        companyId: testCompanyId,
        email: 'duplicate@test.com',
        name: 'User One',
        role: UserRole.FIELD_WORKER
      };

      const user1 = await userService.createUser(userData);

      await expect(
        userService.createUser(userData)
      ).rejects.toThrow('Email already exists');

      // Cleanup
      await prisma.user.delete({ where: { id: user1.id } });
    });
  });

  describe('getUserById', () => {
    it('should get user by id', async () => {
      const created = await prisma.user.create({
        data: {
          companyId: testCompanyId,
          email: 'gettest@test.com',
          name: 'Get Test',
          role: UserRole.FIELD_WORKER
        }
      });

      const user = await userService.getUserById(created.id, testCompanyId);

      expect(user.id).toBe(created.id);
      expect(user.email).toBe('gettest@test.com');

      // Cleanup
      await prisma.user.delete({ where: { id: created.id } });
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        userService.getUserById('non-existent-id', testCompanyId)
      ).rejects.toThrow('User not found');
    });
  });

  describe('listUsers', () => {
    it('should list all users for company', async () => {
      const user1 = await prisma.user.create({
        data: {
          companyId: testCompanyId,
          email: 'list1@test.com',
          name: 'List User 1',
          role: UserRole.FIELD_WORKER
        }
      });

      const user2 = await prisma.user.create({
        data: {
          companyId: testCompanyId,
          email: 'list2@test.com',
          name: 'List User 2',
          role: UserRole.FOREMAN
        }
      });

      const users = await userService.listUsers(testCompanyId);

      expect(users.length).toBeGreaterThanOrEqual(2);
      expect(users.some(u => u.email === 'list1@test.com')).toBe(true);
      expect(users.some(u => u.email === 'list2@test.com')).toBe(true);

      // Cleanup
      await prisma.user.deleteMany({
        where: { id: { in: [user1.id, user2.id] } }
      });
    });
  });
});

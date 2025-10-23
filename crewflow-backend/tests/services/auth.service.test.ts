import { AuthService } from '../../src/services/auth.service';
import prisma from '../../src/lib/db';
import bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(() => {
    authService = new AuthService();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('login', () => {
    it('should return tokens and user for valid credentials', async () => {
      // Create test user
      const passwordHash = await bcrypt.hash('testpass123', 12);
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
          name: 'Test User',
          role: 'FIELD_WORKER',
          company: {
            create: {
              name: 'Test Company'
            }
          }
        }
      });

      const result = await authService.login('test@example.com', 'testpass123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.id).toBe(user.id);

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.company.delete({ where: { id: user.companyId } });
    });

    it('should throw error for invalid password', async () => {
      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});

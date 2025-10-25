# CrewFlow Phase 2: API Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build complete REST API layer for Users, Companies, Projects, and Timecards with comprehensive CRUD operations, validation, and role-based access control.

**Architecture:** RESTful API with layered architecture (Controllers → Services → Database), following Phase 1 patterns. Each entity gets full CRUD operations with proper authorization middleware, input validation, and error handling. TDD approach with unit and integration tests.

**Tech Stack:** Express.js, TypeScript, Prisma ORM, Jest, Supertest

---

## Task 1: Users API - Service Layer

**Files:**
- Create: `src/services/user.service.ts`
- Create: `tests/services/user.service.test.ts`

**Step 1: Write failing test for creating user**

Create `tests/services/user.service.test.ts`:
```typescript
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
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- user.service.test.ts`
Expected: FAIL - "UserService is not defined"

**Step 3: Implement UserService**

Create `src/services/user.service.ts`:
```typescript
import prisma from '../lib/db';
import { UserRole, UserStatus, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

export class UserService {
  async createUser(data: {
    companyId: string;
    email: string;
    name: string;
    role: UserRole;
    phoneNumber?: string;
    password?: string;
  }) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw new Error('Email already exists');
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 12);
    }

    const user = await prisma.user.create({
      data: {
        companyId: data.companyId,
        email: data.email,
        name: data.name,
        role: data.role,
        phoneNumber: data.phoneNumber,
        passwordHash,
        status: UserStatus.ACTIVE
      }
    });

    // Remove passwordHash from response
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserById(id: string, companyId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async listUsers(companyId: string, filters?: {
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  }) {
    const where: Prisma.UserWhereInput = {
      companyId,
      deletedAt: null
    };

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return users.map(({ passwordHash, ...user }) => user);
  }

  async updateUser(id: string, companyId: string, data: {
    name?: string;
    phoneNumber?: string;
    role?: UserRole;
    status?: UserStatus;
  }) {
    const user = await prisma.user.findFirst({
      where: { id, companyId, deletedAt: null }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updated = await prisma.user.update({
      where: { id },
      data
    });

    const { passwordHash: _, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  async deleteUser(id: string, companyId: string) {
    const user = await prisma.user.findFirst({
      where: { id, companyId, deletedAt: null }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- user.service.test.ts`
Expected: PASS

**Step 5: Add more tests**

Add to `tests/services/user.service.test.ts`:
```typescript
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
```

**Step 6: Run tests again**

Run: `npm test -- user.service.test.ts`
Expected: All tests PASS

---

## Task 2: Users API - REST Endpoints

**Files:**
- Create: `src/controllers/user.controller.ts`
- Create: `src/routes/user.routes.ts`
- Modify: `src/index.ts`
- Create: `tests/integration/user.api.test.ts`

**Step 1: Write failing integration test**

Create `tests/integration/user.api.test.ts`:
```typescript
import request from 'supertest';
import app from '../../src/index';
import prisma from '../../src/lib/db';
import bcrypt from 'bcrypt';
import { AuthService } from '../../src/services/auth.service';

describe('User API', () => {
  let testCompanyId: string;
  let adminUserId: string;
  let accessToken: string;

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
  });

  describe('GET /api/v1/users', () => {
    it('should list all users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- user.api.test.ts`
Expected: FAIL - "Cannot POST /api/v1/users"

**Step 3: Create user controller**

Create `src/controllers/user.controller.ts`:
```typescript
import { Response } from 'express';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole, UserStatus } from '@prisma/client';

const userService = new UserService();

export class UserController {
  async createUser(req: AuthRequest, res: Response) {
    try {
      const { email, name, role, phoneNumber, password } = req.body;

      if (!email || !name || !role) {
        return res.status(400).json({ error: 'Email, name, and role are required' });
      }

      const user = await userService.createUser({
        companyId: req.user!.companyId,
        email,
        name,
        role: role as UserRole,
        phoneNumber,
        password
      });

      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof Error && error.message === 'Email already exists') {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id, req.user!.companyId);
      return res.json(user);
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listUsers(req: AuthRequest, res: Response) {
    try {
      const { role, status, search } = req.query;

      const users = await userService.listUsers(req.user!.companyId, {
        role: role as UserRole | undefined,
        status: status as UserStatus | undefined,
        search: search as string | undefined
      });

      return res.json(users);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, phoneNumber, role, status } = req.body;

      const user = await userService.updateUser(id, req.user!.companyId, {
        name,
        phoneNumber,
        role: role as UserRole | undefined,
        status: status as UserStatus | undefined
      });

      return res.json(user);
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id, req.user!.companyId);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

**Step 4: Create user routes**

Create `src/routes/user.routes.ts`:
```typescript
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission, Permission } from '../utils/rbac';

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticate);

router.post('/', requirePermission(Permission.MANAGE_USERS), (req, res) =>
  userController.createUser(req, res)
);

router.get('/', (req, res) => userController.listUsers(req, res));

router.get('/:id', (req, res) => userController.getUser(req, res));

router.put('/:id', requirePermission(Permission.MANAGE_USERS), (req, res) =>
  userController.updateUser(req, res)
);

router.delete('/:id', requirePermission(Permission.MANAGE_USERS), (req, res) =>
  userController.deleteUser(req, res)
);

export default router;
```

**Step 5: Mount routes in main app**

Modify `src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
```

**Step 6: Run tests to verify they pass**

Run: `npm test -- user.api.test.ts`
Expected: PASS

**Step 7: Test manually with curl**

```bash
# Login to get token
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demo.com","password":"password123"}' \
  | jq -r '.accessToken')

# Create user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"worker@demo.com","name":"Field Worker","role":"FIELD_WORKER"}'

# List users
curl http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Users created and listed successfully

---

## Task 3: Companies API

**Files:**
- Create: `src/services/company.service.ts`
- Create: `src/controllers/company.controller.ts`
- Create: `src/routes/company.routes.ts`
- Modify: `src/index.ts`
- Create: `tests/services/company.service.test.ts`
- Create: `tests/integration/company.api.test.ts`

**Step 1: Write failing service test**

Create `tests/services/company.service.test.ts`:
```typescript
import { CompanyService } from '../../src/services/company.service';
import prisma from '../../src/lib/db';

describe('CompanyService', () => {
  let companyService: CompanyService;

  beforeAll(() => {
    companyService = new CompanyService();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getCompany', () => {
    it('should get company by id', async () => {
      const created = await prisma.company.create({
        data: { name: 'Test Company' }
      });

      const company = await companyService.getCompany(created.id);

      expect(company.id).toBe(created.id);
      expect(company.name).toBe('Test Company');

      // Cleanup
      await prisma.company.delete({ where: { id: created.id } });
    });
  });

  describe('updateCompany', () => {
    it('should update company settings', async () => {
      const created = await prisma.company.create({
        data: { name: 'Update Test' }
      });

      const updated = await companyService.updateCompany(created.id, {
        name: 'Updated Name',
        settings: { timezone: 'America/Los_Angeles' }
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.settings).toHaveProperty('timezone');

      // Cleanup
      await prisma.company.delete({ where: { id: created.id } });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- company.service.test.ts`
Expected: FAIL - "CompanyService is not defined"

**Step 3: Implement CompanyService**

Create `src/services/company.service.ts`:
```typescript
import prisma from '../lib/db';

export class CompanyService {
  async getCompany(id: string) {
    const company = await prisma.company.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            users: true,
            projects: true
          }
        }
      }
    });

    if (!company) {
      throw new Error('Company not found');
    }

    return company;
  }

  async updateCompany(id: string, data: {
    name?: string;
    subscriptionTier?: string;
    settings?: any;
  }) {
    const company = await prisma.company.findUnique({
      where: { id, deletedAt: null }
    });

    if (!company) {
      throw new Error('Company not found');
    }

    return await prisma.company.update({
      where: { id },
      data
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- company.service.test.ts`
Expected: PASS

**Step 5: Create controller and routes**

Create `src/controllers/company.controller.ts`:
```typescript
import { Response } from 'express';
import { CompanyService } from '../services/company.service';
import { AuthRequest } from '../middleware/auth.middleware';

const companyService = new CompanyService();

export class CompanyController {
  async getCompany(req: AuthRequest, res: Response) {
    try {
      const company = await companyService.getCompany(req.user!.companyId);
      return res.json(company);
    } catch (error) {
      if (error instanceof Error && error.message === 'Company not found') {
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
      if (error instanceof Error && error.message === 'Company not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

Create `src/routes/company.routes.ts`:
```typescript
import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission, Permission } from '../utils/rbac';

const router = Router();
const companyController = new CompanyController();

router.use(authenticate);

router.get('/', (req, res) => companyController.getCompany(req, res));

router.put('/', requirePermission(Permission.MANAGE_INTEGRATIONS), (req, res) =>
  companyController.updateCompany(req, res)
);

export default router;
```

**Step 6: Mount routes and test**

Add to `src/index.ts`:
```typescript
import companyRoutes from './routes/company.routes';

// ... existing code ...

app.use('/api/v1/company', companyRoutes);
```

**Step 7: Create integration test**

Create `tests/integration/company.api.test.ts`:
```typescript
import request from 'supertest';
import app from '../../src/index';
import prisma from '../../src/lib/db';
import bcrypt from 'bcrypt';
import { AuthService } from '../../src/services/auth.service';

describe('Company API', () => {
  let testCompanyId: string;
  let accessToken: string;

  beforeAll(async () => {
    const company = await prisma.company.create({
      data: { name: 'Test Company' }
    });
    testCompanyId = company.id;

    const passwordHash = await bcrypt.hash('password123', 12);
    await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'owner@test.com',
        passwordHash,
        name: 'Owner',
        role: 'OWNER'
      }
    });

    const authService = new AuthService();
    const result = await authService.login('owner@test.com', 'password123');
    accessToken = result.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('GET /api/v1/company', () => {
    it('should get current company', async () => {
      const response = await request(app)
        .get('/api/v1/company')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testCompanyId);
      expect(response.body.name).toBe('Test Company');
    });
  });

  describe('PUT /api/v1/company', () => {
    it('should update company', async () => {
      const response = await request(app)
        .put('/api/v1/company')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Company',
          settings: { timezone: 'America/Los_Angeles' }
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Company');
    });
  });
});
```

**Step 8: Run all tests**

Run: `npm test`
Expected: All tests PASS

---

## Plan Summary

This plan implements the core REST API layer for Phase 2. After completing these 3 tasks, you will have:

- ✅ Complete Users API (CRUD operations)
- ✅ Complete Companies API (get/update operations)
- ✅ Role-based access control on all endpoints
- ✅ Unit and integration tests for all services
- ✅ Proper error handling and validation

**Next tasks to complete Phase 2:**
- Task 4: Projects API
- Task 5: Timecards API
- Task 6: GraphQL layer (optional, can be Phase 3)
- Task 7: WebSocket for real-time updates (optional, can be Phase 3)

**Remember:**
- @superpowers:test-driven-development - Write tests first
- @superpowers:verification-before-completion - Verify tests pass before moving on
- DRY, YAGNI principles
- Frequent commits after each passing test

---

## Plan Complete

Plan saved to `docs/plans/2025-10-23-phase2-api-layer.md`

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**

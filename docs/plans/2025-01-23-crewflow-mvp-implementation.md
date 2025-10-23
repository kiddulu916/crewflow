# CrewFlow MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-ready workforce management platform for construction companies with mobile time tracking, real-time dashboards, and QuickBooks integration.

**Architecture:** Event-driven, offline-first architecture with TypeScript/Node.js backend (Express + GraphQL), React Native mobile apps, React web dashboard, PostgreSQL + TimescaleDB for data, Redis for caching/queuing, and AWS infrastructure.

**Tech Stack:** Node.js 18, TypeScript 5, Express.js, Apollo GraphQL, Socket.io, React Native, PostgreSQL 15, TimescaleDB, Redis 7, Bull, AWS (ECS, RDS, S3, CloudFront)

---

## Phase 1: Core Platform Foundation (Weeks 1-4)

### Task 1: Project Setup & Infrastructure

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `.github/workflows/ci.yml`
- Create: `src/index.ts`

**Step 1: Initialize Node.js project**

```bash
mkdir crewflow-backend
cd crewflow-backend
npm init -y
```

**Step 2: Install core dependencies**

```bash
npm install express cors helmet morgan dotenv
npm install @types/express @types/cors @types/morgan typescript ts-node-dev @types/node --save-dev
npm install eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier --save-dev
npm install jest @types/jest ts-jest supertest @types/supertest --save-dev
```

**Step 3: Create TypeScript configuration**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 4: Create environment template**

Create `.env.example`:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crewflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-this-in-production
JWT_REFRESH_SECRET=change-this-in-production-too
AWS_REGION=us-east-1
AWS_S3_BUCKET=crewflow-files-dev
```

**Step 5: Create Docker Compose for local development**

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: crewflow
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Step 6: Create basic Express server**

Create `src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

**Step 7: Add npm scripts**

Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

**Step 8: Create GitHub Actions CI**

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: timescale/timescaledb:latest-pg15
        env:
          POSTGRES_DB: crewflow_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

**Step 9: Test local setup**

Run:
```bash
docker-compose up -d
npm run dev
curl http://localhost:3000/health
```

Expected: `{"status":"healthy","timestamp":"..."}`

**Step 10: Commit**

```bash
git add .
git commit -m "feat: initial project setup with TypeScript, Express, Docker"
```

---

### Task 2: Database Setup with Prisma

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `prisma/seed.ts`

**Step 1: Install Prisma**

```bash
npm install @prisma/client
npm install prisma --save-dev
npx prisma init
```

**Step 2: Configure Prisma schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Company {
  id                String   @id @default(uuid())
  name              String
  subscriptionTier  String   @default("standard")
  settings          Json     @default("{}")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?

  users             User[]
  projects          Project[]
  timecards         Timecard[]
  costCodes         CostCode[]
  integrations      Integration[]

  @@map("companies")
}

enum UserRole {
  FIELD_WORKER
  FOREMAN
  PROJECT_MANAGER
  ADMIN
  OWNER
}

enum UserStatus {
  ACTIVE
  INVITED
  INACTIVE
}

model User {
  id                String      @id @default(uuid())
  companyId         String
  email             String      @unique
  passwordHash      String?
  name              String
  role              UserRole
  status            UserStatus  @default(ACTIVE)
  phoneNumber       String?
  profilePhotoUrl   String?
  biometricEnabled  Boolean     @default(false)
  settings          Json        @default("{}")
  lastLoginAt       DateTime?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  deletedAt         DateTime?

  company           Company     @relation(fields: [companyId], references: [id])
  timecards         Timecard[]
  approvedTimecards Timecard[]  @relation("ApprovedBy")
  createdProjects   Project[]   @relation("CreatedBy")

  @@index([companyId])
  @@index([email])
  @@index([role])
  @@map("users")
}

enum ProjectStatus {
  PLANNING
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}

model Project {
  id              String        @id @default(uuid())
  companyId       String
  name            String
  projectNumber   String?
  clientName      String?
  address         String?
  latitude        Decimal?      @db.Decimal(10, 8)
  longitude       Decimal?      @db.Decimal(11, 8)
  geofenceRadius  Int           @default(100)
  status          ProjectStatus @default(ACTIVE)
  startDate       DateTime?
  endDate         DateTime?
  budgetHours     Decimal?      @db.Decimal(10, 2)
  budgetAmount    Decimal?      @db.Decimal(12, 2)
  settings        Json          @default("{}")
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?
  createdById     String?

  company         Company       @relation(fields: [companyId], references: [id])
  createdBy       User?         @relation("CreatedBy", fields: [createdById], references: [id])
  timecards       Timecard[]

  @@index([companyId])
  @@index([status])
  @@map("projects")
}

model CostCode {
  id          String    @id @default(uuid())
  companyId   String
  projectId   String?
  code        String
  description String
  category    String?
  icon        String?
  color       String?
  isActive    Boolean   @default(true)
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  company     Company   @relation(fields: [companyId], references: [id])
  timecards   Timecard[]

  @@unique([companyId, code, projectId])
  @@index([companyId])
  @@map("cost_codes")
}

enum TimecardStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
}

model Timecard {
  id                  String          @id @default(uuid())
  companyId           String
  workerId            String
  projectId           String
  costCodeId          String
  clockIn             DateTime
  clockOut            DateTime?
  clockInLatitude     Decimal?        @db.Decimal(10, 8)
  clockInLongitude    Decimal?        @db.Decimal(11, 8)
  clockOutLatitude    Decimal?        @db.Decimal(10, 8)
  clockOutLongitude   Decimal?        @db.Decimal(11, 8)
  clockInPhotoUrl     String?
  clockOutPhotoUrl    String?
  clockInMethod       String?
  clockOutMethod      String?
  breakMinutes        Int             @default(0)
  notes               String?
  isOvertime          Boolean         @default(false)
  status              TimecardStatus  @default(DRAFT)
  approvedById        String?
  approvedAt          DateTime?
  syncedAt            DateTime?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  deletedAt           DateTime?

  company             Company         @relation(fields: [companyId], references: [id])
  worker              User            @relation(fields: [workerId], references: [id])
  project             Project         @relation(fields: [projectId], references: [id])
  costCode            CostCode        @relation(fields: [costCodeId], references: [id])
  approvedBy          User?           @relation("ApprovedBy", fields: [approvedById], references: [id])

  @@index([companyId])
  @@index([workerId])
  @@index([projectId])
  @@index([clockIn])
  @@index([status])
  @@map("timecards")
}

model Integration {
  id            String    @id @default(uuid())
  companyId     String
  type          String
  enabled       Boolean   @default(false)
  config        Json      @default("{}")
  lastSyncAt    DateTime?
  status        String    @default("pending")
  errorMessage  String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  company       Company   @relation(fields: [companyId], references: [id])

  @@unique([companyId, type])
  @@map("integrations")
}

model SyncEvent {
  id          String   @id @default(uuid())
  deviceId    String
  userId      String
  eventType   String
  entityType  String
  entityId    String
  payload     Json
  timestamp   DateTime @default(now())
  synced      Boolean  @default(false)

  @@index([deviceId, timestamp])
  @@index([synced])
  @@map("sync_events")
}
```

**Step 3: Create database client**

Create `src/lib/db.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
```

**Step 4: Create migration**

Run:
```bash
npx prisma migrate dev --name init
```

Expected: Migration created and applied

**Step 5: Generate Prisma client**

Run:
```bash
npx prisma generate
```

**Step 6: Create seed script**

Create `prisma/seed.ts`:
```typescript
import { PrismaClient, UserRole, UserStatus, ProjectStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create demo company
  const company = await prisma.company.create({
    data: {
      name: 'Demo Construction Co.',
      subscriptionTier: 'standard',
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        overtimeThreshold: 40
      }
    }
  });

  // Create owner user
  const passwordHash = await bcrypt.hash('password123', 12);
  const owner = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'owner@demo.com',
      passwordHash,
      name: 'John Owner',
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE
    }
  });

  // Create demo project
  await prisma.project.create({
    data: {
      companyId: company.id,
      name: 'Miller Residential',
      projectNumber: 'MR-2025-001',
      clientName: 'Miller Family',
      address: '123 Main St, New York, NY',
      latitude: 40.7128,
      longitude: -74.0060,
      status: ProjectStatus.ACTIVE,
      budgetHours: 500,
      budgetAmount: 50000,
      createdById: owner.id
    }
  });

  // Create cost codes
  await prisma.costCode.createMany({
    data: [
      { companyId: company.id, code: '100', description: 'Rough Electrical', category: 'Electrical' },
      { companyId: company.id, code: '110', description: 'Electrical Trim', category: 'Electrical' },
      { companyId: company.id, code: '200', description: 'Rough Plumbing', category: 'Plumbing' },
      { companyId: company.id, code: '300', description: 'Framing', category: 'Carpentry' }
    ]
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 7: Install bcrypt**

```bash
npm install bcrypt
npm install @types/bcrypt --save-dev
```

**Step 8: Add seed script to package.json**

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

**Step 9: Run seed**

```bash
npx prisma db seed
```

Expected: "Seed data created successfully"

**Step 10: Commit**

```bash
git add .
git commit -m "feat: add Prisma schema and database setup with seed data"
```

---

### Task 3: Authentication Service (JWT + RBAC)

**Files:**
- Create: `src/services/auth.service.ts`
- Create: `src/services/jwt.service.ts`
- Create: `src/middleware/auth.middleware.ts`
- Create: `src/utils/rbac.ts`
- Create: `tests/services/auth.service.test.ts`

**Step 1: Write failing test for login**

Create `tests/services/auth.service.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- auth.service.test.ts`
Expected: FAIL - "AuthService is not defined"

**Step 3: Install JWT dependencies**

```bash
npm install jsonwebtoken ioredis
npm install @types/jsonwebtoken @types/ioredis --save-dev
```

**Step 4: Create JWT service**

Create `src/services/jwt.service.ts`:
```typescript
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface JWTPayload {
  userId: string;
  companyId: string;
  role: string;
  sessionId: string;
}

export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry = '15m';
  private refreshTokenExpiry = '7d';

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'dev-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
  }

  generateTokens(userId: string, companyId: string, role: string): { accessToken: string; refreshToken: string; sessionId: string } {
    const sessionId = `session:${userId}:${Date.now()}`;

    const payload: JWTPayload = {
      userId,
      companyId,
      role,
      sessionId
    };

    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry
    });

    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry
    });

    // Store refresh token in Redis
    redis.setex(`refresh:${sessionId}`, 7 * 24 * 60 * 60, refreshToken);

    return { accessToken, refreshToken, sessionId };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as JWTPayload;

      // Check if refresh token exists in Redis
      const storedToken = await redis.get(`refresh:${payload.sessionId}`);
      if (!storedToken || storedToken !== token) {
        throw new Error('Refresh token not found or invalid');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async revokeRefreshToken(sessionId: string): Promise<void> {
    await redis.del(`refresh:${sessionId}`);
  }
}
```

**Step 5: Create auth service**

Create `src/services/auth.service.ts`:
```typescript
import bcrypt from 'bcrypt';
import prisma from '../lib/db';
import { JWTService } from './jwt.service';

export class AuthService {
  private jwtService: JWTService;

  constructor() {
    this.jwtService = new JWTService();
  }

  async login(email: string, password: string, deviceId?: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true }
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new Error('User account is not active');
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.jwtService.generateTokens(
      user.id,
      user.companyId,
      user.role
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Return tokens and user (excluding password)
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword
    };
  }

  async refreshToken(refreshToken: string) {
    const payload = await this.jwtService.verifyRefreshToken(refreshToken);

    // Generate new tokens (rotate refresh token)
    await this.jwtService.revokeRefreshToken(payload.sessionId);
    const tokens = this.jwtService.generateTokens(
      payload.userId,
      payload.companyId,
      payload.role
    );

    return tokens;
  }

  async logout(sessionId: string) {
    await this.jwtService.revokeRefreshToken(sessionId);
  }
}
```

**Step 6: Run test to verify it passes**

Run: `npm test -- auth.service.test.ts`
Expected: PASS

**Step 7: Create auth middleware**

Create `src/middleware/auth.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';

const jwtService = new JWTService();

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    companyId: string;
    role: string;
    sessionId: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = await jwtService.verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**Step 8: Create RBAC utility**

Create `src/utils/rbac.ts`:
```typescript
import { UserRole } from '@prisma/client';

export enum Permission {
  VIEW_OWN_TIME = 'view:own_time',
  EDIT_OWN_TIME = 'edit:own_time',
  VIEW_CREW_TIME = 'view:crew_time',
  APPROVE_TIME = 'approve:time',
  VIEW_ALL_TIME = 'view:all_time',
  MANAGE_PROJECTS = 'manage:projects',
  MANAGE_USERS = 'manage:users',
  VIEW_FINANCIALS = 'view:financials',
  EXPORT_PAYROLL = 'export:payroll',
  MANAGE_INTEGRATIONS = 'manage:integrations'
}

const rolePermissions: Record<UserRole, Permission[]> = {
  FIELD_WORKER: [
    Permission.VIEW_OWN_TIME,
    Permission.EDIT_OWN_TIME
  ],
  FOREMAN: [
    Permission.VIEW_OWN_TIME,
    Permission.EDIT_OWN_TIME,
    Permission.VIEW_CREW_TIME,
    Permission.APPROVE_TIME
  ],
  PROJECT_MANAGER: [
    Permission.VIEW_ALL_TIME,
    Permission.APPROVE_TIME,
    Permission.MANAGE_PROJECTS,
    Permission.VIEW_FINANCIALS
  ],
  ADMIN: [
    Permission.VIEW_ALL_TIME,
    Permission.APPROVE_TIME,
    Permission.MANAGE_PROJECTS,
    Permission.MANAGE_USERS,
    Permission.VIEW_FINANCIALS,
    Permission.EXPORT_PAYROLL,
    Permission.MANAGE_INTEGRATIONS
  ],
  OWNER: Object.values(Permission)
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) || false;
}

export function requirePermission(permission: Permission) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!hasPermission(req.user.role as UserRole, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
```

**Step 9: Update tests to check they pass**

Run: `npm test`
Expected: All tests PASS

**Step 10: Commit**

```bash
git add .
git commit -m "feat: add authentication service with JWT and RBAC"
```

---

### Task 4: REST API Endpoints - Authentication

**Files:**
- Create: `src/routes/auth.routes.ts`
- Create: `src/controllers/auth.controller.ts`
- Modify: `src/index.ts`
- Create: `tests/integration/auth.api.test.ts`

**Step 1: Write failing integration test**

Create `tests/integration/auth.api.test.ts`:
```typescript
import request from 'supertest';
import app from '../../src/index';
import prisma from '../../src/lib/db';
import bcrypt from 'bcrypt';

describe('Auth API', () => {
  let testCompanyId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test company and user
    const company = await prisma.company.create({
      data: { name: 'Test Company' }
    });
    testCompanyId = company.id;

    const passwordHash = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'test@test.com',
        passwordHash,
        name: 'Test User',
        role: 'FIELD_WORKER'
      }
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return tokens for valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@test.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- auth.api.test.ts`
Expected: FAIL - "Cannot POST /api/v1/auth/login"

**Step 3: Create auth controller**

Create `src/controllers/auth.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password, deviceId } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const result = await authService.login(email, password, deviceId);
      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        return res.status(401).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      const tokens = await authService.refreshToken(refreshToken);
      return res.json(tokens);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      // Extract sessionId from refresh token and revoke
      await authService.logout(refreshToken);
      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

**Step 4: Create auth routes**

Create `src/routes/auth.routes.ts`:
```typescript
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

router.post('/login', (req, res) => authController.login(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;
```

**Step 5: Mount auth routes in main app**

Modify `src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';

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

**Step 6: Run test to verify it passes**

Run: `npm test -- auth.api.test.ts`
Expected: PASS

**Step 7: Test manually with curl**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demo.com","password":"password123"}'
```

Expected: JSON with accessToken, refreshToken, user

**Step 8: Commit**

```bash
git add .
git commit -m "feat: add authentication REST API endpoints"
```

---

## Next Steps

This plan continues with:

**Phase 2: API Layer (Weeks 5-8)**
- REST API for Users, Companies, Projects, Timecards
- GraphQL schema and resolvers
- Sync engine implementation
- WebSocket server for real-time updates

**Phase 3: Mobile App (Field Operations, Weeks 1-16)**
- React Native project setup
- Authentication integration
- Clock in/out functionality
- Offline sync with SQLite
- GPS tracking and geofencing

**Phase 4: Web Dashboard (Intelligence Layer, Weeks 1-16)**
- React dashboard setup
- Real-time charts and analytics
- Report generation (PDF, Excel, CSV)
- Integration with WebSocket for live updates

**Phase 5: External Integrations (Weeks 1-16)**
- QuickBooks OAuth setup
- Timecard sync to QuickBooks
- Employee/Customer import
- Health monitoring and fallback CSV

---

## Plan Complete

Plan saved to `docs/plans/2025-01-23-crewflow-mvp-implementation.md`

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**

# GraphQL API + WebSocket Server - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add GraphQL API layer and WebSocket server for real-time updates to enable rich client queries and live dashboard features

**Architecture:** Apollo Server 4 for GraphQL, Socket.io for WebSocket, integrated with existing Express REST API

**Tech Stack:** Node.js 18, TypeScript 5, Apollo Server 4, Socket.io 4, GraphQL, Express

**Current Status:**
- ✅ REST API complete (Users, Companies, Projects, Timecards)
- ✅ All 104 tests passing
- ✅ RBAC implemented
- ⏳ No GraphQL layer
- ⏳ No WebSocket server
- ⏳ No real-time updates

---

## Overview

This plan implements:
1. **GraphQL API** - Rich query capabilities for web/mobile clients
2. **WebSocket Server** - Real-time updates for dashboards
3. **Schema-first design** - Type-safe GraphQL schema
4. **RBAC integration** - GraphQL resolvers enforce permissions
5. **Real-time events** - Broadcast changes to subscribed clients

---

## Task 1: Setup Apollo Server with Express

**Files:**
- Create: `src/graphql/schema.ts`
- Create: `src/graphql/resolvers/index.ts`
- Create: `src/graphql/context.ts`
- Modify: `src/index.ts`
- Modify: `package.json`

### Step 1: Install GraphQL dependencies

Run:
```bash
cd crewflow-backend
npm install @apollo/server graphql graphql-tag
npm install -D @graphql-tools/schema
```

Expected: Dependencies installed successfully

### Step 2: Create GraphQL schema file

Create `src/graphql/schema.ts`:

```typescript
import { gql } from 'graphql-tag';

export const typeDefs = gql`
  # Scalar types
  scalar DateTime
  scalar JSON

  # Enums
  enum Role {
    FIELD_WORKER
    FOREMAN
    PROJECT_MANAGER
    ADMIN
    OWNER
  }

  enum ProjectStatus {
    ACTIVE
    COMPLETED
    ON_HOLD
  }

  enum TimecardStatus {
    DRAFT
    SUBMITTED
    APPROVED
    REJECTED
  }

  # User Type
  type User {
    id: ID!
    email: String!
    name: String!
    role: Role!
    companyId: ID!
    company: Company!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Company Type
  type Company {
    id: ID!
    name: String!
    settings: JSON
    users: [User!]!
    projects: [Project!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Project Type
  type Project {
    id: ID!
    name: String!
    description: String
    status: ProjectStatus!
    companyId: ID!
    company: Company!
    budgetHours: Float
    budgetAmount: Float
    startDate: DateTime
    endDate: DateTime
    location: String
    geofenceLatitude: Float
    geofenceLongitude: Float
    geofenceRadius: Float
    timecards: [Timecard!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Timecard Type
  type Timecard {
    id: ID!
    companyId: ID!
    workerId: ID!
    projectId: ID!
    costCodeId: ID!
    worker: User!
    project: Project!
    costCode: CostCode!
    clockIn: DateTime!
    clockOut: DateTime
    breakMinutes: Int!
    status: TimecardStatus!
    notes: String
    clockInLatitude: Float
    clockInLongitude: Float
    clockOutLatitude: Float
    clockOutLongitude: Float
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # CostCode Type
  type CostCode {
    id: ID!
    companyId: ID!
    code: String!
    description: String!
    category: String!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Query Type
  type Query {
    # User queries
    me: User!
    user(id: ID!): User
    users(role: Role, limit: Int, offset: Int): [User!]!

    # Company queries
    company: Company!

    # Project queries
    project(id: ID!): Project
    projects(status: ProjectStatus, search: String, limit: Int, offset: Int): [Project!]!

    # Timecard queries
    timecard(id: ID!): Timecard
    timecards(
      workerId: ID
      projectId: ID
      status: TimecardStatus
      startDate: DateTime
      endDate: DateTime
      limit: Int
      offset: Int
    ): [Timecard!]!

    # CostCode queries
    costCodes(category: String, isActive: Boolean): [CostCode!]!
  }

  # Mutation Type
  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!

    # Project mutations
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!

    # Timecard mutations
    createTimecard(input: CreateTimecardInput!): Timecard!
    updateTimecard(id: ID!, input: UpdateTimecardInput!): Timecard!
    deleteTimecard(id: ID!): Boolean!
  }

  # Input Types
  input CreateUserInput {
    email: String!
    password: String!
    name: String!
    role: Role!
  }

  input UpdateUserInput {
    name: String
    role: Role
  }

  input CreateProjectInput {
    name: String!
    description: String
    status: ProjectStatus
    budgetHours: Float
    budgetAmount: Float
    startDate: DateTime
    endDate: DateTime
    location: String
    geofenceLatitude: Float
    geofenceLongitude: Float
    geofenceRadius: Float
  }

  input UpdateProjectInput {
    name: String
    description: String
    status: ProjectStatus
    budgetHours: Float
    budgetAmount: Float
    startDate: DateTime
    endDate: DateTime
    location: String
    geofenceLatitude: Float
    geofenceLongitude: Float
    geofenceRadius: Float
  }

  input CreateTimecardInput {
    workerId: ID!
    projectId: ID!
    costCodeId: ID!
    clockIn: DateTime!
    clockInLatitude: Float
    clockInLongitude: Float
    notes: String
  }

  input UpdateTimecardInput {
    clockOut: DateTime
    clockOutLatitude: Float
    clockOutLongitude: Float
    breakMinutes: Int
    notes: String
    status: TimecardStatus
  }
`;
```

### Step 3: Create GraphQL context

Create `src/graphql/context.ts`:

```typescript
import { Request } from 'express';
import { verifyAccessToken } from '../services/jwt.service';

export interface GraphQLContext {
  user?: {
    userId: string;
    companyId: string;
    role: string;
  };
  req: Request;
}

export async function createContext({ req }: { req: Request }): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return { req };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = await verifyAccessToken(token);
    return {
      req,
      user: {
        userId: decoded.userId,
        companyId: decoded.companyId,
        role: decoded.role
      }
    };
  } catch (error) {
    return { req };
  }
}
```

### Step 4: Create resolver structure

Create `src/graphql/resolvers/index.ts`:

```typescript
import { GraphQLContext } from '../context';
import { GraphQLError } from 'graphql';
import { GraphQLScalarType, Kind } from 'graphql';
import prisma from '../../lib/db';
import { hasPermission, Permission } from '../../utils/rbac';

// Custom DateTime scalar
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date custom scalar type',
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// Custom JSON scalar
const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => {
    if (ast.kind === Kind.OBJECT) {
      return ast;
    }
    return null;
  },
});

// Helper: Require authentication
function requireAuth(context: GraphQLContext) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' }
    });
  }
  return context.user;
}

// Helper: Require permission
function requirePermission(context: GraphQLContext, permission: Permission) {
  const user = requireAuth(context);

  if (!hasPermission(user.role as any, permission)) {
    throw new GraphQLError('Insufficient permissions', {
      extensions: { code: 'FORBIDDEN' }
    });
  }

  return user;
}

export const resolvers = {
  DateTime: dateTimeScalar,
  JSON: jsonScalar,

  Query: {
    // User queries
    me: async (_: any, __: any, context: GraphQLContext) => {
      const user = requireAuth(context);

      return prisma.user.findUnique({
        where: { id: user.userId }
      });
    },

    user: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireAuth(context);

      return prisma.user.findFirst({
        where: {
          id,
          companyId: user.companyId,
          deletedAt: null
        }
      });
    },

    users: async (
      _: any,
      { role, limit = 50, offset = 0 }: any,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      return prisma.user.findMany({
        where: {
          companyId: user.companyId,
          deletedAt: null,
          ...(role && { role })
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      });
    },

    // Company queries
    company: async (_: any, __: any, context: GraphQLContext) => {
      const user = requireAuth(context);

      return prisma.company.findUnique({
        where: { id: user.companyId }
      });
    },

    // Project queries
    project: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireAuth(context);

      return prisma.project.findFirst({
        where: {
          id,
          companyId: user.companyId,
          deletedAt: null
        }
      });
    },

    projects: async (
      _: any,
      { status, search, limit = 50, offset = 0 }: any,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      return prisma.project.findMany({
        where: {
          companyId: user.companyId,
          deletedAt: null,
          ...(status && { status }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          })
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      });
    },

    // Timecard queries
    timecard: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireAuth(context);

      return prisma.timecard.findFirst({
        where: {
          id,
          companyId: user.companyId,
          deletedAt: null
        }
      });
    },

    timecards: async (
      _: any,
      { workerId, projectId, status, startDate, endDate, limit = 50, offset = 0 }: any,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      const where: any = {
        companyId: user.companyId,
        deletedAt: null
      };

      if (workerId) where.workerId = workerId;
      if (projectId) where.projectId = projectId;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.clockIn = {};
        if (startDate) where.clockIn.gte = new Date(startDate);
        if (endDate) where.clockIn.lte = new Date(endDate);
      }

      return prisma.timecard.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { clockIn: 'desc' }
      });
    },

    // CostCode queries
    costCodes: async (
      _: any,
      { category, isActive }: any,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      return prisma.costCode.findMany({
        where: {
          companyId: user.companyId,
          ...(category && { category }),
          ...(isActive !== undefined && { isActive })
        },
        orderBy: { code: 'asc' }
      });
    },
  },

  Mutation: {
    // User mutations (placeholder - implement later)
    createUser: async (_: any, { input }: any, context: GraphQLContext) => {
      requirePermission(context, Permission.MANAGE_USERS);
      throw new GraphQLError('Not implemented yet');
    },

    updateUser: async (_: any, { id, input }: any, context: GraphQLContext) => {
      requirePermission(context, Permission.MANAGE_USERS);
      throw new GraphQLError('Not implemented yet');
    },

    deleteUser: async (_: any, { id }: any, context: GraphQLContext) => {
      requirePermission(context, Permission.MANAGE_USERS);
      throw new GraphQLError('Not implemented yet');
    },

    // Project mutations (placeholder)
    createProject: async (_: any, { input }: any, context: GraphQLContext) => {
      requirePermission(context, Permission.MANAGE_PROJECTS);
      throw new GraphQLError('Not implemented yet');
    },

    updateProject: async (_: any, { id, input }: any, context: GraphQLContext) => {
      requirePermission(context, Permission.MANAGE_PROJECTS);
      throw new GraphQLError('Not implemented yet');
    },

    deleteProject: async (_: any, { id }: any, context: GraphQLContext) => {
      requirePermission(context, Permission.MANAGE_PROJECTS);
      throw new GraphQLError('Not implemented yet');
    },

    // Timecard mutations (placeholder)
    createTimecard: async (_: any, { input }: any, context: GraphQLContext) => {
      requirePermission(context, Permission.MANAGE_TIMECARDS);
      throw new GraphQLError('Not implemented yet');
    },

    updateTimecard: async (_: any, { id, input }: any, context: GraphQLContext) => {
      requirePermission(context, Permission.MANAGE_TIMECARDS);
      throw new GraphQLError('Not implemented yet');
    },

    deleteTimecard: async (_: any, { id }: any, context: GraphQLContext) => {
      requirePermission(context, Permission.MANAGE_TIMECARDS);
      throw new GraphQLError('Not implemented yet');
    },
  },

  // Field resolvers
  User: {
    company: (parent: any) => {
      return prisma.company.findUnique({
        where: { id: parent.companyId }
      });
    },
  },

  Company: {
    users: (parent: any) => {
      return prisma.user.findMany({
        where: {
          companyId: parent.id,
          deletedAt: null
        }
      });
    },
    projects: (parent: any) => {
      return prisma.project.findMany({
        where: {
          companyId: parent.id,
          deletedAt: null
        }
      });
    },
  },

  Project: {
    company: (parent: any) => {
      return prisma.company.findUnique({
        where: { id: parent.companyId }
      });
    },
    timecards: (parent: any) => {
      return prisma.timecard.findMany({
        where: {
          projectId: parent.id,
          deletedAt: null
        }
      });
    },
  },

  Timecard: {
    worker: (parent: any) => {
      return prisma.user.findUnique({
        where: { id: parent.workerId }
      });
    },
    project: (parent: any) => {
      return prisma.project.findUnique({
        where: { id: parent.projectId }
      });
    },
    costCode: (parent: any) => {
      return prisma.costCode.findUnique({
        where: { id: parent.costCodeId }
      });
    },
  },
};
```

### Step 5: Integrate Apollo Server with Express

Update `src/index.ts`:

```typescript
// Add imports at top
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { createContext } from './graphql/context';

// After creating Express app, before routes, add:
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start Apollo Server before starting Express
await apolloServer.start();

// Add GraphQL endpoint after REST routes
app.use(
  '/graphql',
  express.json(),
  expressMiddleware(apolloServer, {
    context: createContext,
  })
);
```

### Step 6: Update package.json for ES modules

Modify `package.json` to add:

```json
{
  "type": "module"
}
```

**OR** rename `src/index.ts` to use `.mjs` extension, **OR** use dynamic imports.

**Recommended**: Use top-level await which requires either ES modules or Node 18+ with module resolution.

### Step 7: Test GraphQL endpoint

Run:
```bash
npm run dev
```

Then visit: `http://localhost:3000/graphql`

Expected: Apollo Server Sandbox loads successfully

### Step 8: Run a test query

In Apollo Sandbox, try:

```graphql
query Me {
  me {
    id
    email
    name
    role
  }
}
```

Add authorization header:
```
{
  "Authorization": "Bearer <your-token>"
}
```

Expected: Returns authenticated user data

### Step 9: Commit changes

Run:
```bash
git add .
git commit -m "feat: add GraphQL API with Apollo Server"
```

Expected: Clean commit

---

## Task 2: Add WebSocket Server with Socket.io

**Files:**
- Create: `src/websocket/server.ts`
- Create: `src/websocket/handlers.ts`
- Modify: `src/index.ts`
- Modify: `package.json`

### Step 1: Install Socket.io

Run:
```bash
npm install socket.io
npm install -D @types/socket.io
```

### Step 2: Create WebSocket server

Create `src/websocket/server.ts`:

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyAccessToken } from '../services/jwt.service';

export function initializeWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    },
    path: '/ws'
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = await verifyAccessToken(token);

      socket.data.user = {
        userId: decoded.userId,
        companyId: decoded.companyId,
        role: decoded.role
      };

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id} (User: ${socket.data.user.userId})`);

    // Join company-specific room
    const companyRoom = `company:${socket.data.user.companyId}`;
    socket.join(companyRoom);
    console.log(`User joined room: ${companyRoom}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  return io;
}

// Export io instance for use in other parts of the app
let ioInstance: SocketIOServer | null = null;

export function setIOInstance(io: SocketIOServer) {
  ioInstance = io;
}

export function getIOInstance(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('WebSocket server not initialized');
  }
  return ioInstance;
}

// Helper: Broadcast to company
export function broadcastToCompany(companyId: string, event: string, data: any) {
  const io = getIOInstance();
  io.to(`company:${companyId}`).emit(event, data);
}
```

### Step 3: Create event handlers

Create `src/websocket/handlers.ts`:

```typescript
import { broadcastToCompany } from './server';

// Timecard events
export function emitTimecardCreated(companyId: string, timecard: any) {
  broadcastToCompany(companyId, 'timecard:created', { timecard });
}

export function emitTimecardUpdated(companyId: string, timecard: any) {
  broadcastToCompany(companyId, 'timecard:updated', { timecard });
}

export function emitTimecardDeleted(companyId: string, timecardId: string) {
  broadcastToCompany(companyId, 'timecard:deleted', { timecardId });
}

// Project events
export function emitProjectCreated(companyId: string, project: any) {
  broadcastToCompany(companyId, 'project:created', { project });
}

export function emitProjectUpdated(companyId: string, project: any) {
  broadcastToCompany(companyId, 'project:updated', { project });
}

export function emitProjectDeleted(companyId: string, projectId: string) {
  broadcastToCompany(companyId, 'project:deleted', { projectId });
}

// User events
export function emitUserCreated(companyId: string, user: any) {
  broadcastToCompany(companyId, 'user:created', { user });
}

export function emitUserUpdated(companyId: string, user: any) {
  broadcastToCompany(companyId, 'user:updated', { user });
}

export function emitUserDeleted(companyId: string, userId: string) {
  broadcastToCompany(companyId, 'user:deleted', { userId });
}
```

### Step 4: Integrate WebSocket with Express

Update `src/index.ts`:

```typescript
// Add imports
import { createServer } from 'http';
import { initializeWebSocket, setIOInstance } from './websocket/server';

// Replace app.listen with HTTP server
const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

// Initialize WebSocket server
const io = initializeWebSocket(httpServer);
setIOInstance(io);

// Start server
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  });
}

// Export both app and server for testing
export { app, httpServer };
```

### Step 5: Add WebSocket events to controllers

Example: Update `src/controllers/timecard.controller.ts`:

```typescript
// Add import
import { emitTimecardCreated, emitTimecardUpdated, emitTimecardDeleted } from '../websocket/handlers';

// In createTimecard method, after creating:
const timecard = await timecardService.createTimecard({...});

// Emit WebSocket event
emitTimecardCreated(req.user!.companyId, timecard);

return res.status(201).json(timecard);
```

Repeat for updateTimecard and deleteTimecard methods.

### Step 6: Test WebSocket connection

Create a simple test client (`test-ws.html`):

```html
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Test</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>WebSocket Test Client</h1>
  <div id="status">Disconnected</div>
  <div id="messages"></div>

  <script>
    const token = 'YOUR_ACCESS_TOKEN_HERE';

    const socket = io('http://localhost:3000', {
      path: '/ws',
      auth: { token }
    });

    socket.on('connect', () => {
      document.getElementById('status').textContent = 'Connected: ' + socket.id;
    });

    socket.on('disconnect', () => {
      document.getElementById('status').textContent = 'Disconnected';
    });

    // Listen for timecard events
    socket.on('timecard:created', (data) => {
      const div = document.getElementById('messages');
      div.innerHTML += '<p>Timecard created: ' + JSON.stringify(data) + '</p>';
    });

    socket.on('timecard:updated', (data) => {
      const div = document.getElementById('messages');
      div.innerHTML += '<p>Timecard updated: ' + JSON.stringify(data) + '</p>';
    });

    // Ping test
    setInterval(() => {
      socket.emit('ping');
    }, 5000);

    socket.on('pong', () => {
      console.log('Pong received');
    });
  </script>
</body>
</html>
```

### Step 7: Test real-time updates

1. Open `test-ws.html` in browser (connected)
2. Create a timecard via REST API or GraphQL
3. Verify WebSocket event received in browser

Expected: Real-time update shows in test client

### Step 8: Commit changes

Run:
```bash
git add .
git commit -m "feat: add WebSocket server with Socket.io for real-time updates"
```

---

## Task 3: Write Integration Tests

**Files:**
- Create: `tests/integration/graphql.test.ts`
- Create: `tests/integration/websocket.test.ts`

### Step 1: Create GraphQL test file

Create `tests/integration/graphql.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/lib/db';
import bcrypt from 'bcrypt';
import { AuthService } from '../../src/services/auth.service';

describe('GraphQL API', () => {
  let testCompanyId: string;
  let ownerUserId: string;
  let ownerToken: string;

  beforeAll(async () => {
    // Setup test data
    const company = await prisma.company.create({
      data: { name: 'GraphQL Test Company' }
    });
    testCompanyId = company.id;

    const passwordHash = await bcrypt.hash('password123', 12);
    const owner = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'graphql-owner@test.com',
        passwordHash,
        name: 'GraphQL Owner',
        role: 'OWNER'
      }
    });
    ownerUserId = owner.id;

    const authService = new AuthService();
    const result = await authService.login('graphql-owner@test.com', 'password123');
    ownerToken = result.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('Query: me', () => {
    it('should return authenticated user', async () => {
      const query = `
        query {
          me {
            id
            email
            name
            role
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.data.me).toBeDefined();
      expect(response.body.data.me.email).toBe('graphql-owner@test.com');
      expect(response.body.data.me.role).toBe('OWNER');
    });

    it('should return error without authentication', async () => {
      const query = `
        query {
          me {
            id
            email
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Query: company', () => {
    it('should return company for authenticated user', async () => {
      const query = `
        query {
          company {
            id
            name
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.data.company).toBeDefined();
      expect(response.body.data.company.name).toBe('GraphQL Test Company');
    });
  });

  // Add more tests for other queries...
});
```

### Step 2: Create WebSocket test file

Create `tests/integration/websocket.test.ts`:

```typescript
import { io as ioClient, Socket } from 'socket.io-client';
import { httpServer } from '../../src/index';
import prisma from '../../src/lib/db';
import bcrypt from 'bcrypt';
import { AuthService } from '../../src/services/auth.service';

describe('WebSocket Server', () => {
  let testCompanyId: string;
  let ownerToken: string;
  let client: Socket;

  beforeAll(async () => {
    // Setup test data
    const company = await prisma.company.create({
      data: { name: 'WebSocket Test Company' }
    });
    testCompanyId = company.id;

    const passwordHash = await bcrypt.hash('password123', 12);
    await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'ws-owner@test.com',
        passwordHash,
        name: 'WS Owner',
        role: 'OWNER'
      }
    });

    const authService = new AuthService();
    const result = await authService.login('ws-owner@test.com', 'password123');
    ownerToken = result.accessToken;
  });

  afterAll(async () => {
    if (client) client.disconnect();
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  it('should connect with valid token', (done) => {
    client = ioClient('http://localhost:3000', {
      path: '/ws',
      auth: { token: ownerToken }
    });

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      done();
    });

    client.on('connect_error', (error) => {
      done(error);
    });
  });

  it('should reject connection without token', (done) => {
    const clientNoAuth = ioClient('http://localhost:3000', {
      path: '/ws'
    });

    clientNoAuth.on('connect_error', (error) => {
      expect(error.message).toContain('Authentication required');
      clientNoAuth.disconnect();
      done();
    });

    clientNoAuth.on('connect', () => {
      clientNoAuth.disconnect();
      done(new Error('Should not connect without token'));
    });
  });

  it('should respond to ping with pong', (done) => {
    client = ioClient('http://localhost:3000', {
      path: '/ws',
      auth: { token: ownerToken }
    });

    client.on('connect', () => {
      client.emit('ping');
    });

    client.on('pong', () => {
      done();
    });
  });

  // Add more WebSocket event tests...
});
```

### Step 3: Run tests

Run:
```bash
npm test -- graphql.test.ts
npm test -- websocket.test.ts
```

Expected: All tests pass

### Step 4: Run full test suite

Run:
```bash
npm test
```

Expected: All 104+ tests pass (including new GraphQL/WebSocket tests)

---

## Task 4: Update Documentation

**Files:**
- Update: `README.md`
- Update: `tasks/todo.md`

### Step 1: Update README with GraphQL/WebSocket info

Add to `README.md`:

```markdown
## API Endpoints

### REST API
- Base URL: `http://localhost:3000/api/v1`
- Authentication: Bearer token in Authorization header

### GraphQL API
- Endpoint: `http://localhost:3000/graphql`
- Playground: Available in development mode
- Authentication: Bearer token in Authorization header

Example query:
\`\`\`graphql
query {
  me {
    id
    email
    name
    role
  }
  projects {
    id
    name
    status
  }
}
\`\`\`

### WebSocket Server
- Endpoint: `ws://localhost:3000/ws`
- Authentication: Pass token in connection auth object

Example connection:
\`\`\`javascript
const socket = io('http://localhost:3000', {
  path: '/ws',
  auth: { token: 'your-access-token' }
});

socket.on('timecard:created', (data) => {
  console.log('New timecard:', data);
});
\`\`\`

## Real-time Events

The WebSocket server broadcasts the following events:
- \`timecard:created\`
- \`timecard:updated\`
- \`timecard:deleted\`
- \`project:created\`
- \`project:updated\`
- \`project:deleted\`
- \`user:created\`
- \`user:updated\`
- \`user:deleted\`
```

### Step 2: Update tasks/todo.md

Add new section to `tasks/todo.md`:

```markdown
# Task 5: GraphQL API + WebSocket Server (Phase 4)

## Plan

### Step 1: Setup Apollo Server
- [x] Install GraphQL dependencies
- [x] Create GraphQL schema
- [x] Create GraphQL context
- [x] Create resolvers
- [x] Integrate with Express
- [x] Test GraphQL endpoint

### Step 2: Add WebSocket Server
- [x] Install Socket.io
- [x] Create WebSocket server
- [x] Add authentication middleware
- [x] Create event handlers
- [x] Integrate with Express
- [x] Test WebSocket connection

### Step 3: Write Integration Tests
- [x] GraphQL query tests
- [x] WebSocket connection tests
- [x] Run full test suite

### Step 4: Update Documentation
- [x] Update README.md
- [x] Update tasks/todo.md

---

## Review - Task 5 Complete (YYYY-MM-DD)

### Summary of Changes

Successfully implemented GraphQL API and WebSocket server for real-time updates.

### Files Created
1. `src/graphql/schema.ts` - GraphQL type definitions
2. `src/graphql/resolvers/index.ts` - GraphQL resolvers
3. `src/graphql/context.ts` - GraphQL context with auth
4. `src/websocket/server.ts` - Socket.io server
5. `src/websocket/handlers.ts` - WebSocket event emitters
6. `tests/integration/graphql.test.ts` - GraphQL tests
7. `tests/integration/websocket.test.ts` - WebSocket tests

### Files Modified
1. `src/index.ts` - Integrated Apollo Server and Socket.io
2. `src/controllers/timecard.controller.ts` - Added WebSocket events
3. `package.json` - Added dependencies
4. `README.md` - Documentation

### Test Results
- GraphQL tests: X/X passing
- WebSocket tests: X/X passing
- Full test suite: XXX/XXX passing

### Features Implemented
1. **GraphQL API** - Rich queries for all entities
2. **Real-time WebSocket** - Live updates for dashboards
3. **RBAC in GraphQL** - Permission checks in resolvers
4. **Company-scoped rooms** - WebSocket broadcasts per company
5. **Authentication** - JWT tokens for both GraphQL and WebSocket

### Next Steps
Phase 4 complete! Ready for:
- Event Bus implementation
- Sync Engine for offline-first mobile
- Mobile app integration
```

---

## Success Criteria

**Technical:**
- ✅ GraphQL endpoint at `/graphql` functional
- ✅ WebSocket server at `/ws` functional
- ✅ All queries return correct data
- ✅ RBAC enforced in GraphQL resolvers
- ✅ Real-time events broadcast correctly
- ✅ Authentication works for both GraphQL and WebSocket
- ✅ All tests pass

**Code Quality:**
- ✅ Type-safe GraphQL schema
- ✅ Resolvers follow existing patterns
- ✅ WebSocket events documented
- ✅ Integration tests cover main scenarios

---

## Time Estimate

**Total:** 4-6 hours

- Task 1 (Apollo Server): 2-3 hours
- Task 2 (WebSocket): 1-2 hours
- Task 3 (Tests): 1-2 hours
- Task 4 (Documentation): 30 minutes

---

## Appendix: Testing GraphQL Queries

### Example Queries

**Get current user:**
```graphql
query {
  me {
    id
    email
    name
    role
    company {
      id
      name
    }
  }
}
```

**Get projects with timecards:**
```graphql
query {
  projects(status: ACTIVE) {
    id
    name
    status
    timecards {
      id
      worker {
        name
      }
      clockIn
      clockOut
    }
  }
}
```

**Get timecards with filters:**
```graphql
query {
  timecards(
    status: APPROVED
    startDate: "2025-10-01T00:00:00Z"
    endDate: "2025-10-31T23:59:59Z"
  ) {
    id
    worker {
      name
    }
    project {
      name
    }
    clockIn
    clockOut
    status
  }
}
```

---

**Document Status:** Implementation Plan
**Last Updated:** 2025-10-26
**Estimated Time:** 4-6 hours
**Prerequisites:** REST API complete, all tests passing

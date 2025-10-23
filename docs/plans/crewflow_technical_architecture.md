# CrewFlow: Technical Architecture Deep-Dive
## Production-Ready System Design for Workforce Management Platform

---

## Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   iOS App    │  │ Android App  │  │  Web App     │         │
│  │  (Swift)     │  │  (Kotlin)    │  │  (React)     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │   API Gateway      │
                   │   (Kong/AWS ALB)   │
                   └─────────┬──────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    APPLICATION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                             │                                     │
│  ┌──────────────────────────┴─────────────────────────────┐     │
│  │                                                         │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │     │
│  │  │   REST API  │  │  GraphQL    │  │  WebSocket  │   │     │
│  │  │  (Express)  │  │  (Apollo)   │  │  (Socket.io)│   │     │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │     │
│  │         │                 │                 │          │     │
│  │         └─────────────────┴─────────────────┘          │     │
│  │                           │                             │     │
│  │         ┌─────────────────┴─────────────────┐          │     │
│  │         │   Application Services Layer      │          │     │
│  │         │                                    │          │     │
│  │    ┌────┴────┬────────┬────────┬────────────┴────┐    │     │
│  │    │         │        │        │                  │    │     │
│  │  ┌─▼──┐  ┌──▼─┐  ┌──▼─┐  ┌───▼───┐  ┌────────▼─┐│    │     │
│  │  │Auth│  │Time│  │Proj│  │Payroll│  │Analytics ││    │     │
│  │  │Svc │  │Svc │  │Svc │  │ Svc   │  │  Engine  ││    │     │
│  │  └────┘  └────┘  └────┘  └───────┘  └──────────┘│    │     │
│  │                                                    │    │     │
│  └────────────────────────────────────────────────────┘    │     │
│                                                             │     │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                        DATA LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                             │                                     │
│  ┌──────────────────────────┴─────────────────────────────┐     │
│  │                                                         │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │     │
│  │  │ PostgreSQL  │  │    Redis    │  │ MongoDB     │   │     │
│  │  │  (Primary)  │  │  (Cache)    │  │  (Docs)     │   │     │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │     │
│  │                                                         │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │     │
│  │  │     S3      │  │ ElasticSearch│ │  TimescaleDB│   │     │
│  │  │  (Files)    │  │  (Search)   │  │   (Metrics) │   │     │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │     │
│  │                                                         │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES LAYER                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ QuickBooks   │  │    Twilio    │  │    Stripe    │          │
│  │     API      │  │   (SMS)      │  │  (Payments)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Sendgrid   │  │   AWS SNS    │  │  Google Maps │          │
│  │   (Email)    │  │   (Push)     │  │     API      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      AI/ML SERVICES LAYER                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Prediction  │  │    Facial    │  │    Smart     │          │
│  │   Service    │  │ Recognition  │  │  Suggestions │          │
│  │  (Python)    │  │ (TensorFlow) │  │   (OpenAI)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Decisions

### Backend Stack

**Primary Language**: Node.js (TypeScript)
- **Why**: Fast development, huge ecosystem, excellent for I/O-heavy operations
- **Alternative considered**: Go (faster but smaller talent pool)
- **Decision**: TypeScript for type safety and maintainability

**API Framework**: Express.js + Apollo GraphQL
- **REST API** (Express): Simple CRUD operations, webhooks, integrations
- **GraphQL** (Apollo): Complex queries, mobile apps (reduces over-fetching)
- **Why both**: REST for integrations (standard), GraphQL for mobile (efficiency)

**Real-Time**: Socket.io
- **Why**: Mature, works everywhere, easy fallbacks (WebSocket → long-polling)
- **Use cases**: Live location updates, instant notifications, dashboard updates

### Database Architecture

**Primary Database**: PostgreSQL 15
- **Why**: ACID compliance (critical for payroll), excellent JSON support, mature
- **Alternatives considered**: MySQL (no JSON functions), MongoDB (no transactions)
- **Schema design**: Normalized for consistency, denormalized where needed for performance

**Caching Layer**: Redis 7
- **Why**: Blazing fast, pub/sub for real-time, can be persistent
- **Use cases**: Session storage, API rate limiting, real-time updates queue
- **Persistence**: AOF enabled for critical data (auth sessions)

**Time-Series Data**: TimescaleDB
- **Why**: PostgreSQL extension, handles GPS/location data efficiently
- **Use cases**: Location history, metrics, analytics
- **Compression**: Automatic after 7 days (saves 90% storage)

**Document Store**: MongoDB (limited use)
- **Why**: Flexible schema for integration data, audit logs
- **Use cases**: Third-party API responses, change logs, unstructured data
- **Not for**: Core business data (use PostgreSQL)

**Search Engine**: Elasticsearch
- **Why**: Full-text search, worker/project discovery
- **Use cases**: Search workers by skill, find projects, search documents
- **Sync**: Logstash keeps it in sync with PostgreSQL

**File Storage**: AWS S3 + CloudFront CDN
- **Why**: Unlimited storage, cheap, fast globally via CDN
- **Use cases**: Photos, documents, reports
- **Lifecycle**: Frequent → IA after 90 days → Glacier after 1 year

### Mobile Stack

**Framework**: React Native
- **Why**: One codebase = iOS + Android (60% time savings)
- **When to go native**: Performance-critical features (GPS, facial recognition)
- **Approach**: React Native + Native Modules where needed

**State Management**: Redux Toolkit + RTK Query
- **Why**: Predictable state, excellent DevTools, caching built-in
- **Offline**: Redux Persist for offline data storage

**Local Database**: WatermelonDB
- **Why**: Built for React Native, fast sync, great offline support
- **Use cases**: Offline timecards, schedules, project data

**Navigation**: React Navigation
- **Why**: Standard, well-maintained, deep linking support

**Native Modules**:
- GPS tracking: Custom native module (Swift/Kotlin)
- Facial recognition: TensorFlow Lite (on-device)
- Background location: react-native-background-geolocation

### Frontend Web Stack

**Framework**: React 18 + TypeScript
- **Why**: Component reuse from React Native, huge ecosystem
- **Build tool**: Vite (10x faster than Webpack)
- **Styling**: Tailwind CSS (utility-first, fast development)

**State Management**: Redux Toolkit (same as mobile)
- **Why**: Share logic between web and mobile, consistency

**Data Fetching**: Apollo Client (GraphQL) + RTK Query (REST)
- **Why**: Automatic caching, optimistic updates, dev tools

**UI Components**: Headless UI + Radix UI + Custom
- **Why**: Accessible, unstyled (full control), battle-tested
- **Custom**: Construction-themed components (orange/yellow palette)

---

## Database Schema Design

### Core Tables (PostgreSQL)

```sql
-- Organizations (Contractor Companies)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_plan VARCHAR(50) DEFAULT 'standard',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Users (Workers, Foremen, PMs, Admins)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL, -- worker, foreman, pm, admin, owner
  status VARCHAR(50) DEFAULT 'active',
  profile_photo_url TEXT,
  settings JSONB DEFAULT '{}',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT valid_role CHECK (role IN ('worker', 'foreman', 'pm', 'admin', 'owner'))
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  project_number VARCHAR(100),
  client_name VARCHAR(255),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius INTEGER DEFAULT 100, -- meters
  status VARCHAR(50) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget_hours DECIMAL(10, 2),
  budget_amount DECIMAL(12, 2),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_location ON projects USING GIST(
  ll_to_earth(latitude, longitude)
);

-- Cost Codes
CREATE TABLE cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id) NULL, -- NULL = company-wide
  code VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  category VARCHAR(100),
  icon VARCHAR(50), -- icon identifier
  color VARCHAR(7), -- hex color
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, code, project_id)
);

CREATE INDEX idx_cost_codes_org ON cost_codes(organization_id);
CREATE INDEX idx_cost_codes_project ON cost_codes(project_id);

-- Time Entries (Individual Clock Events)
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  cost_code_id UUID REFERENCES cost_codes(id),
  
  clock_in_time TIMESTAMP NOT NULL,
  clock_out_time TIMESTAMP NULL,
  clock_in_latitude DECIMAL(10, 8),
  clock_in_longitude DECIMAL(11, 8),
  clock_out_latitude DECIMAL(10, 8),
  clock_out_longitude DECIMAL(11, 8),
  
  clock_in_photo_url TEXT,
  clock_out_photo_url TEXT,
  clock_in_method VARCHAR(50), -- app, kiosk, qr, nfc, bluetooth
  clock_out_method VARCHAR(50),
  
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  is_overtime BOOLEAN DEFAULT false,
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  synced_at TIMESTAMP NULL, -- NULL = created offline, waiting to sync
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_time_entries_org ON time_entries(organization_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(clock_in_time);
CREATE INDEX idx_time_entries_status ON time_entries(status);

-- Timecards (Daily Summary)
CREATE TABLE timecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  work_date DATE NOT NULL,
  
  total_hours DECIMAL(5, 2) DEFAULT 0,
  regular_hours DECIMAL(5, 2) DEFAULT 0,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  break_hours DECIMAL(5, 2) DEFAULT 0,
  
  status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved, rejected
  submitted_at TIMESTAMP,
  submitted_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id, work_date)
);

CREATE INDEX idx_timecards_org ON timecards(organization_id);
CREATE INDEX idx_timecards_user ON timecards(user_id);
CREATE INDEX idx_timecards_date ON timecards(work_date);
CREATE INDEX idx_timecards_status ON timecards(status);

-- Production Tracking
CREATE TABLE production_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES time_entries(id),
  cost_code_id UUID REFERENCES cost_codes(id),
  
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50), -- feet, square feet, units, etc.
  description TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Schedules
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id) NULL, -- NULL = unassigned
  crew_id UUID REFERENCES crews(id) NULL,
  
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  
  task_description TEXT,
  cost_code_id UUID REFERENCES cost_codes(id),
  
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crews (Teams)
CREATE TABLE crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,
  foreman_id UUID REFERENCES users(id),
  specialty VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crew_members (
  crew_id UUID REFERENCES crews(id),
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (crew_id, user_id)
);

-- Integration Configs
CREATE TABLE integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  integration_type VARCHAR(50) NOT NULL, -- quickbooks, sage, xero, etc.
  
  credentials JSONB, -- encrypted
  settings JSONB DEFAULT '{}',
  field_mappings JSONB DEFAULT '{}',
  
  status VARCHAR(50) DEFAULT 'disconnected',
  last_sync_at TIMESTAMP,
  last_sync_status VARCHAR(50),
  last_error TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, integration_type)
);

-- Sync Logs
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_config_id UUID REFERENCES integration_configs(id),
  
  sync_type VARCHAR(50), -- timecards, employees, projects, etc.
  direction VARCHAR(20), -- import, export
  
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status VARCHAR(50), -- running, completed, failed
  error_details JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs (Compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  
  old_values JSONB,
  new_values JSONB,
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);
```

### Time-Series Tables (TimescaleDB)

```sql
-- Location History (Hypertable)
CREATE TABLE location_history (
  time TIMESTAMPTZ NOT NULL,
  user_id UUID NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2), -- meters
  speed DECIMAL(5, 2), -- meters per second
  heading DECIMAL(5, 2), -- degrees
  altitude DECIMAL(10, 2), -- meters
  battery_level INTEGER, -- percentage
  
  project_id UUID,
  is_clocked_in BOOLEAN DEFAULT false
);

SELECT create_hypertable('location_history', 'time');

-- Create retention policy (delete after 90 days)
SELECT add_retention_policy('location_history', INTERVAL '90 days');

-- Automatic compression after 7 days
ALTER TABLE location_history SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id'
);

SELECT add_compression_policy('location_history', INTERVAL '7 days');

-- Application Metrics
CREATE TABLE app_metrics (
  time TIMESTAMPTZ NOT NULL,
  organization_id UUID,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(20, 4) NOT NULL,
  tags JSONB DEFAULT '{}'
);

SELECT create_hypertable('app_metrics', 'time');
SELECT add_retention_policy('app_metrics', INTERVAL '365 days');
```

---

## API Architecture

### REST API Endpoints

**Authentication**:
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
```

**Time Tracking**:
```
POST   /api/v1/time-entries/clock-in
POST   /api/v1/time-entries/clock-out
GET    /api/v1/time-entries
GET    /api/v1/time-entries/:id
PUT    /api/v1/time-entries/:id
DELETE /api/v1/time-entries/:id

GET    /api/v1/timecards
POST   /api/v1/timecards/:id/submit
POST   /api/v1/timecards/:id/approve
POST   /api/v1/timecards/:id/reject
```

**Projects**:
```
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id
GET    /api/v1/projects/:id/budget
```

**Integrations**:
```
GET    /api/v1/integrations
POST   /api/v1/integrations/:type/connect
POST   /api/v1/integrations/:type/disconnect
GET    /api/v1/integrations/:type/status
POST   /api/v1/integrations/:type/sync
POST   /api/v1/integrations/:type/test
```

**Webhooks** (for external systems):
```
POST   /api/v1/webhooks/quickbooks
POST   /api/v1/webhooks/stripe
```

### GraphQL Schema

```graphql
type Query {
  # User queries
  me: User!
  user(id: ID!): User
  users(filter: UserFilter, limit: Int, offset: Int): UserConnection!
  
  # Time tracking
  timeEntries(filter: TimeEntryFilter): [TimeEntry!]!
  timecard(userId: ID!, date: Date!): Timecard
  timecards(filter: TimecardFilter): [Timecard!]!
  
  # Projects
  project(id: ID!): Project
  projects(filter: ProjectFilter): [Project!]!
  projectBudget(id: ID!): ProjectBudget!
  
  # Analytics
  dashboardStats(dateRange: DateRange!): DashboardStats!
  crewPerformance(crewId: ID!, dateRange: DateRange!): CrewPerformance!
  laborCostAnalysis(projectId: ID!): LaborCostAnalysis!
  
  # Predictions (AI)
  predictedCrewNeeds(projectId: ID!, date: Date!): CrewPrediction!
  suggestedCostCode(context: CostCodeContext!): [CostCodeSuggestion!]!
  optimalCrewComposition(projectId: ID!): [CrewSuggestion!]!
}

type Mutation {
  # Authentication
  login(email: String!, password: String!): AuthPayload!
  refreshToken(token: String!): AuthPayload!
  
  # Time tracking
  clockIn(input: ClockInInput!): TimeEntry!
  clockOut(timeEntryId: ID!): TimeEntry!
  createTimeEntry(input: TimeEntryInput!): TimeEntry!
  updateTimeEntry(id: ID!, input: TimeEntryInput!): TimeEntry!
  
  submitTimecard(userId: ID!, date: Date!): Timecard!
  approveTimecard(id: ID!): Timecard!
  rejectTimecard(id: ID!, reason: String!): Timecard!
  
  # Projects
  createProject(input: ProjectInput!): Project!
  updateProject(id: ID!, input: ProjectInput!): Project!
  
  # Scheduling
  createSchedule(input: ScheduleInput!): Schedule!
  updateSchedule(id: ID!, input: ScheduleInput!): Schedule!
  assignWorkerToSchedule(scheduleId: ID!, userId: ID!): Schedule!
}

type Subscription {
  # Real-time updates
  timeEntryCreated(projectId: ID!): TimeEntry!
  workerClockedIn(projectId: ID!): WorkerStatus!
  locationUpdated(userId: ID!): Location!
  timecardApprovalNeeded: Timecard!
}

# Types
type User {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  fullName: String!
  role: UserRole!
  phoneNumber: String
  profilePhotoUrl: String
  organization: Organization!
  crews: [Crew!]!
  currentLocation: Location
  isOnline: Boolean!
  lastSeen: DateTime
}

type TimeEntry {
  id: ID!
  user: User!
  project: Project!
  costCode: CostCode!
  clockInTime: DateTime!
  clockOutTime: DateTime
  duration: Int # minutes
  clockInLocation: Location!
  clockOutLocation: Location
  clockInPhoto: String
  status: TimeEntryStatus!
  notes: String
  isOvertime: Boolean!
  approvedBy: User
  approvedAt: DateTime
}

type Project {
  id: ID!
  name: String!
  projectNumber: String
  client: String
  address: String
  location: Location!
  geofenceRadius: Int!
  status: ProjectStatus!
  startDate: Date
  endDate: Date
  budget: ProjectBudget!
  activeWorkers(limit: Int): [User!]!
  totalHoursWorked: Float!
  laborCost: Float!
}

type ProjectBudget {
  budgetHours: Float!
  actualHours: Float!
  remainingHours: Float!
  percentComplete: Float!
  budgetAmount: Float!
  actualAmount: Float!
  remainingAmount: Float!
  isOverBudget: Boolean!
  projectedOverrun: Float
}

type DashboardStats {
  totalProjects: Int!
  activeProjects: Int!
  totalWorkers: Int!
  workersOnSite: Int!
  todayLaborCost: Float!
  weekLaborCost: Float!
  monthLaborCost: Float!
  projectsAtRisk: [Project!]!
  topPerformingCrews: [CrewPerformance!]!
}

# Enums
enum UserRole {
  WORKER
  FOREMAN
  PROJECT_MANAGER
  ADMIN
  OWNER
}

enum TimeEntryStatus {
  PENDING
  APPROVED
  REJECTED
}

enum ProjectStatus {
  PLANNING
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}
```

### API Security

**Authentication Strategy**:
```typescript
// JWT-based authentication
interface JWTPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
  sessionId: string;
  iat: number;
  exp: number;
}

// Access token: 15 minutes expiry
// Refresh token: 30 days expiry (stored in Redis)

// Middleware
const authenticateJWT = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session is still valid in Redis
    const session = await redis.get(`session:${decoded.sessionId}`);
    if (!session) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

**Rate Limiting**:
```typescript
// Redis-based rate limiting
const rateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  
  // Different limits for different endpoints
  keyGenerator: (req) => {
    return `${req.user.organizationId}:${req.user.userId}`;
  },
  
  skip: (req) => {
    // Skip rate limiting for webhooks
    return req.path.startsWith('/api/v1/webhooks');
  }
});

// Critical endpoints (clock-in/out): More lenient
const clockRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 clock-ins per minute
});
```

**Role-Based Access Control (RBAC)**:
```typescript
enum Permission {
  VIEW_OWN_TIME = 'view:own_time',
  EDIT_OWN_TIME = 'edit:own_time',
  VIEW_CREW_TIME = 'view:crew_time',
  APPROVE_TIME = 'approve:time',
  VIEW_ALL_TIME = 'view:all_time',
  MANAGE_PROJECTS = 'manage:projects',
  MANAGE_USERS = 'manage:users',
  VIEW_FINANCIALS = 'view:financials',
  EXPORT_PAYROLL = 'export:payroll',
  MANAGE_INTEGRATIONS = 'manage:integrations',
}

const rolePermissions: Record<UserRole, Permission[]> = {
  WORKER: [
    Permission.VIEW_OWN_TIME,
    Permission.EDIT_OWN_TIME,
  ],
  FOREMAN: [
    Permission.VIEW_OWN_TIME,
    Permission.EDIT_OWN_TIME,
    Permission.VIEW_CREW_TIME,
    Permission.APPROVE_TIME,
  ],
  PROJECT_MANAGER: [
    Permission.VIEW_ALL_TIME,
    Permission.APPROVE_TIME,
    Permission.MANAGE_PROJECTS,
    Permission.VIEW_FINANCIALS,
  ],
  ADMIN: [
    Permission.VIEW_ALL_TIME,
    Permission.APPROVE_TIME,
    Permission.MANAGE_PROJECTS,
    Permission.MANAGE_USERS,
    Permission.VIEW_FINANCIALS,
    Permission.EXPORT_PAYROLL,
    Permission.MANAGE_INTEGRATIONS,
  ],
  OWNER: Object.values(Permission), // All permissions
};

// Middleware
const requirePermission = (permission: Permission) => {
  return (req, res, next) => {
    const userPermissions = rolePermissions[req.user.role];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Usage
app.post('/api/v1/timecards/:id/approve',
  authenticateJWT,
  requirePermission(Permission.APPROVE_TIME),
  approveTimecardHandler
);
```

---

## Offline Sync Architecture

### Strategy: Optimistic UI with Conflict Resolution

**Key Principles**:
1. App works 100% offline (workers in basements, remote sites)
2. Changes sync automatically when online
3. Conflicts resolved gracefully (last-write-wins with manual resolution for critical data)

### Implementation

**Client-Side Queue**:
```typescript
interface QueuedAction {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'UPDATE_TIME_ENTRY' | 'SUBMIT_TIMECARD';
  payload: any;
  timestamp: number;
  attempts: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}

class OfflineSyncManager {
  private queue: QueuedAction[] = [];
  private syncInProgress = false;
  
  // Add action to queue
  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'attempts' | 'status'>) {
    const queuedAction: QueuedAction = {
      ...action,
      id: uuid.v4(),
      timestamp: Date.now(),
      attempts: 0,
      status: 'pending'
    };
    
    this.queue.push(queuedAction);
    await this.persistQueue();
    
    // Try to sync immediately if online
    if (await this.isOnline()) {
      this.processQueue();
    }
    
    return queuedAction.id;
  }
  
  // Process queue when online
  async processQueue() {
    if (this.syncInProgress) return;
    if (!(await this.isOnline())) return;
    
    this.syncInProgress = true;
    
    const pendingActions = this.queue.filter(a => a.status === 'pending');
    
    for (const action of pendingActions) {
      try {
        action.status = 'syncing';
        
        // Call API based on action type
        const result = await this.syncAction(action);
        
        action.status = 'synced';
        
        // Update local database with server IDs
        await this.updateLocalRecord(action, result);
        
      } catch (error) {
        action.attempts++;
        
        if (action.attempts >= 3) {
          action.status = 'failed';
          action.error = error.message;
          
          // Notify user of sync failure
          this.notifyUser(action);
        } else {
          action.status = 'pending';
          
          // Exponential backoff
          await this.delay(Math.pow(2, action.attempts) * 1000);
        }
      }
    }
    
    // Remove synced actions
    this.queue = this.queue.filter(a => a.status !== 'synced');
    await this.persistQueue();
    
    this.syncInProgress = false;
  }
  
  private async syncAction(action: QueuedAction) {
    switch (action.type) {
      case 'CLOCK_IN':
        return await api.post('/time-entries/clock-in', action.payload);
      case 'CLOCK_OUT':
        return await api.post('/time-entries/clock-out', action.payload);
      // ... other cases
    }
  }
  
  private async persistQueue() {
    await AsyncStorage.setItem('sync_queue', JSON.stringify(this.queue));
  }
  
  private async isOnline() {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  }
}
```

**Conflict Resolution**:
```typescript
interface ConflictResolution {
  clientVersion: any;
  serverVersion: any;
  conflictType: 'time_overlap' | 'already_approved' | 'data_mismatch';
  resolution: 'use_server' | 'use_client' | 'manual';
}

const resolveConflict = async (conflict: ConflictResolution) => {
  switch (conflict.conflictType) {
    case 'time_overlap':
      // Server has overlapping time entry
      // Resolution: Keep server, notify user
      return {
        action: 'use_server',
        message: 'Your time entry overlaps with an existing entry. Using server version.',
      };
      
    case 'already_approved':
      // Server version already approved by foreman
      // Resolution: Keep server, warn user
      return {
        action: 'use_server',
        message: 'This timecard was already approved. Cannot make changes.',
      };
      
    case 'data_mismatch':
      // Both client and server have different values
      // Resolution: Manual - show UI for user to choose
      return {
        action: 'manual',
        message: 'Your offline changes conflict with server. Please review.',
      };
      
    default:
      // Default: Last-write-wins (use client version)
      return {
        action: 'use_client',
      };
  }
};
```

**Data Synchronization**:
```typescript
// When app comes online
const syncOnReconnect = async () => {
  // 1. Upload pending changes (queue processing)
  await offlineSyncManager.processQueue();
  
  // 2. Download updates from server
  const lastSyncTime = await getLastSyncTime();
  
  const updates = await api.get('/sync/changes', {
    params: { since: lastSyncTime }
  });
  
  // 3. Apply updates to local database
  await localDB.applyUpdates(updates);
  
  // 4. Update last sync time
  await setLastSyncTime(new Date());
};

// Listen for network changes
NetInfo.addEventListener(state => {
  if (state.isConnected && state.isInternetReachable) {
    syncOnReconnect();
  }
});
```

---

## GPS & Location Tracking

### Battery-Efficient GPS Strategy

**Problem**: Continuous GPS drains battery (dead by noon)  
**Solution**: Adaptive tracking based on work status

```typescript
class GPSManager {
  private trackingMode: 'stopped' | 'low_power' | 'high_accuracy' = 'stopped';
  
  async startTracking(mode: 'clock_in' | 'during_work' | 'clock_out') {
    switch (mode) {
      case 'clock_in':
      case 'clock_out':
        // High accuracy for clock events
        this.trackingMode = 'high_accuracy';
        await this.configureGPS({
          accuracy: 'high', // ±5 meters
          interval: 1000, // Every 1 second
          timeout: 30000, // 30 seconds max
        });
        break;
        
      case 'during_work':
        // Low power during work
        this.trackingMode = 'low_power';
        await this.configureGPS({
          accuracy: 'balanced', // ±50 meters (good enough)
          interval: 300000, // Every 5 minutes
          distanceFilter: 100, // Only if moved 100+ meters
        });
        break;
    }
  }
  
  async stopTracking() {
    this.trackingMode = 'stopped';
    await BackgroundGeolocation.stop();
  }
  
  // Geofencing for automatic clock-in
  async setupGeofence(project: Project) {
    await BackgroundGeolocation.addGeofence({
      identifier: project.id,
      latitude: project.latitude,
      longitude: project.longitude,
      radius: project.geofenceRadius,
      notifyOnEntry: true,
      notifyOnExit: true,
      notifyOnDwell: false,
    });
  }
  
  // Handle geofence events
  onGeofenceEvent(event: GeofenceEvent) {
    if (event.action === 'ENTER') {
      // Show notification: "You're at Miller Residential. Clock in?"
      this.showClockInPrompt(event.identifier);
    } else if (event.action === 'EXIT') {
      // Check if user forgot to clock out
      if (this.isCurrentlyClockedIn(event.identifier)) {
        this.showClockOutReminder(event.identifier);
      }
    }
  }
}
```

**Location Privacy**:
```typescript
// Only track location during work hours
const shouldTrackLocation = (user: User) => {
  const now = new Date();
  const hour = now.getHours();
  
  // Only track 6 AM - 8 PM
  if (hour < 6 || hour > 20) {
    return false;
  }
  
  // Only if currently clocked in
  if (!user.currentTimeEntry) {
    return false;
  }
  
  // User can opt out
  if (user.settings.disableLocationTracking) {
    return false;
  }
  
  return true;
};
```

### Location Verification

```typescript
const verifyLocation = (
  clockLocation: { lat: number; lon: number },
  projectLocation: { lat: number; lon: number },
  geofenceRadius: number
): LocationVerification => {
  
  const distance = calculateDistance(clockLocation, projectLocation);
  
  if (distance <= geofenceRadius) {
    return {
      valid: true,
      distance,
      message: 'Location verified'
    };
  }
  
  // Allow clock-in if close (grace distance)
  if (distance <= geofenceRadius + 50) {
    return {
      valid: true,
      distance,
      warning: 'You are near the edge of the job site',
    };
  }
  
  // Too far
  return {
    valid: false,
    distance,
    error: `You are ${Math.round(distance)}m from the job site. Please move closer to clock in.`,
  };
};

// Haversine formula for distance
const calculateDistance = (
  point1: { lat: number; lon: number },
  point2: { lat: number; lon: number }
): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = point1.lat * Math.PI / 180;
  const φ2 = point2.lat * Math.PI / 180;
  const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
  const Δλ = (point2.lon - point1.lon) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance in meters
};
```

---

## Real-Time Features (WebSocket)

### Connection Management

```typescript
// Server-side (Socket.io)
io.on('connection', (socket) => {
  // Authenticate socket
  const token = socket.handshake.auth.token;
  const user = await authenticateToken(token);
  
  if (!user) {
    socket.disconnect();
    return;
  }
  
  // Join organization room
  socket.join(`org:${user.organizationId}`);
  
  // Join user room
  socket.join(`user:${user.id}`);
  
  // Track online status
  await redis.sadd(`online:${user.organizationId}`, user.id);
  
  // Broadcast user online
  io.to(`org:${user.organizationId}`).emit('user:online', {
    userId: user.id,
    timestamp: new Date(),
  });
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    await redis.srem(`online:${user.organizationId}`, user.id);
    
    io.to(`org:${user.organizationId}`).emit('user:offline', {
      userId: user.id,
      timestamp: new Date(),
    });
  });
  
  // Handle location updates
  socket.on('location:update', async (data) => {
    // Store in TimescaleDB
    await storeLocation(user.id, data);
    
    // Broadcast to project managers watching this user
    io.to(`org:${user.organizationId}`).emit('location:updated', {
      userId: user.id,
      location: data,
    });
  });
  
  // Handle time entry events
  socket.on('time:clock-in', async (data) => {
    const timeEntry = await createTimeEntry(user.id, data);
    
    // Notify foreman
    const foreman = await getForeman(data.projectId);
    io.to(`user:${foreman.id}`).emit('time:clock-in-notification', {
      worker: user,
      timeEntry,
    });
    
    // Update dashboard
    io.to(`org:${user.organizationId}`).emit('dashboard:update', {
      activeWorkers: await getActiveWorkerCount(user.organizationId),
    });
  });
});

// Client-side (React Native)
const socket = io('wss://api.crewflow.com', {
  auth: {
    token: await getAuthToken(),
  },
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Send location updates (every 5 minutes when clocked in)
const sendLocationUpdate = async () => {
  const location = await getCurrentLocation();
  socket.emit('location:update', {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    timestamp: new Date(),
  });
};

// Listen for real-time updates
socket.on('time:clock-in-notification', (data) => {
  showNotification(`${data.worker.firstName} just clocked in`);
  refreshDashboard();
});
```

---

## AI/ML Services Architecture

### 1. Crew Optimization Service (Python)

```python
# crew_optimizer.py
from sklearn.ensemble import RandomForestRegressor
import pandas as pd
import numpy as np

class CrewOptimizer:
    def __init__(self):
        self.model = None
        
    def train(self, historical_data: pd.DataFrame):
        """
        Train model on historical crew performance
        
        Features:
        - crew_composition (member IDs)
        - project_type
        - weather_conditions
        - day_of_week
        - project_complexity
        
        Target:
        - productivity_score (actual_hours / estimated_hours)
        """
        
        X = historical_data[[
            'crew_size',
            'avg_experience_years',
            'project_type_encoded',
            'weather_temp',
            'weather_precip',
            'day_of_week',
            'project_complexity'
        ]]
        
        y = historical_data['productivity_score']
        
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        self.model.fit(X, y)
        
    def predict_performance(self, crew_composition, project_context):
        """
        Predict how well a crew will perform on a project
        """
        features = self.extract_features(crew_composition, project_context)
        predicted_score = self.model.predict([features])[0]
        
        return {
            'productivity_score': predicted_score,
            'confidence': self.model.score([features], [predicted_score]),
            'recommendation': self.generate_recommendation(predicted_score)
        }
        
    def suggest_optimal_crew(self, available_workers, project_requirements):
        """
        Suggest best crew composition from available workers
        """
        from itertools import combinations
        
        crew_size = project_requirements['required_crew_size']
        
        # Generate all possible crew combinations
        possible_crews = combinations(available_workers, crew_size)
        
        best_crew = None
        best_score = 0
        
        for crew in possible_crews:
            score = self.predict_performance(crew, project_requirements)
            if score['productivity_score'] > best_score:
                best_score = score['productivity_score']
                best_crew = crew
                
        return {
            'recommended_crew': best_crew,
            'expected_productivity': best_score,
            'reasoning': self.explain_recommendation(best_crew)
        }
```

### 2. Smart Cost Code Suggestions (OpenAI)

```typescript
// smart_suggestions.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const suggestCostCode = async (context: {
  projectType: string;
  recentCostCodes: string[];
  currentLocation: string;
  timeOfDay: string;
  foreman: string;
}) => {
  
  const prompt = `You are a construction project assistant. Based on the following context, suggest the most likely cost code the worker should use:

Project Type: ${context.projectType}
Recent Cost Codes Used: ${context.recentCostCodes.join(', ')}
Current Location: ${context.currentLocation}
Time of Day: ${context.timeOfDay}
Foreman: ${context.foreman}

Available Cost Codes:
- 100: Rough Electrical
- 110: Electrical Trim
- 120: Panel Installation
- 200: Rough Plumbing
- 210: Fixture Installation
- 300: Framing
- 310: Drywall Installation

Suggest the top 3 most likely cost codes and explain why in one sentence each.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3, // Low temperature for consistent suggestions
    max_tokens: 200,
  });
  
  return parseSuggestions(response.choices[0].message.content);
};

const parseSuggestions = (aiResponse: string) => {
  // Parse AI response into structured suggestions
  // This is simplified; you'd want more robust parsing
  const lines = aiResponse.split('\n').filter(l => l.trim());
  
  return lines.map(line => {
    const [code, reason] = line.split(':');
    return {
      costCode: code.trim(),
      confidence: 0.85,
      reason: reason?.trim() || 'Based on recent patterns'
    };
  });
};
```

### 3. Facial Recognition (TensorFlow Lite)

```typescript
// facial_recognition_module.ts (React Native Native Module)

import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as facemesh from '@tensorflow-models/facemesh';

class FacialRecognitionService {
  private model: any;
  private knownFaces: Map<string, Float32Array> = new Map();
  
  async initialize() {
    // Load pre-trained face detection model
    this.model = await blazeface.load();
    
    // Load known face embeddings from server
    const knownFaces = await this.fetchKnownFaces();
    knownFaces.forEach(face => {
      this.knownFaces.set(face.userId, new Float32Array(face.embedding));
    });
  }
  
  async recognizeFace(imageBase64: string): Promise<RecognitionResult> {
    // Convert base64 to tensor
    const imageTensor = this.base64ToTensor(imageBase64);
    
    // Detect face in image
    const faces = await this.model.estimateFaces(imageTensor);
    
    if (faces.length === 0) {
      return { success: false, error: 'No face detected' };
    }
    
    if (faces.length > 1) {
      return { success: false, error: 'Multiple faces detected' };
    }
    
    // Generate embedding for detected face
    const faceEmbedding = await this.generateEmbedding(faces[0]);
    
    // Compare with known faces
    const match = this.findBestMatch(faceEmbedding);
    
    if (match.confidence > 0.75) {
      return {
        success: true,
        userId: match.userId,
        confidence: match.confidence
      };
    } else {
      return {
        success: false,
        error: 'Face not recognized',
        confidence: match.confidence
      };
    }
  }
  
  private findBestMatch(embedding: Float32Array): { userId: string; confidence: number } {
    let bestMatch = { userId: '', confidence: 0 };
    
    for (const [userId, knownEmbedding] of this.knownFaces) {
      const similarity = this.cosineSimilarity(embedding, knownEmbedding);
      
      if (similarity > bestMatch.confidence) {
        bestMatch = { userId, confidence: similarity };
      }
    }
    
    return bestMatch;
  }
  
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

---

## Integration Architecture

### QuickBooks Integration (Example)

```typescript
// quickbooks_integration.ts

import QuickBooks from 'node-quickbooks';

class QuickBooksIntegration {
  private qbo: QuickBooks;
  
  constructor(config: IntegrationConfig) {
    this.qbo = new QuickBooks(
      config.credentials.consumerKey,
      config.credentials.consumerSecret,
      config.credentials.accessToken,
      config.credentials.accessTokenSecret,
      config.credentials.realmId,
      true, // use sandbox
      false, // debug
      null, // minor version
      '2.0', // oauth version
      config.credentials.refreshToken
    );
  }
  
  async syncTimecards(timecards: Timecard[]): Promise<SyncResult> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    for (const timecard of timecards) {
      try {
        // Map CrewFlow employee to QuickBooks employee
        const qbEmployeeId = await this.mapEmployee(timecard.userId);
        
        // Create time activity in QuickBooks
        const timeActivity = {
          NameOf: 'Employee',
          EmployeeRef: { value: qbEmployeeId },
          Hours: timecard.totalHours,
          Minutes: Math.round((timecard.totalHours % 1) * 60),
          TxnDate: timecard.workDate,
          Description: `CrewFlow timecard #${timecard.id}`,
          // Map to QuickBooks service item (cost code)
          ItemRef: { value: await this.mapCostCode(timecard.costCodeId) }
        };
        
        await this.qbo.createTimeActivity(timeActivity);
        
        // Update sync status
        await this.updateTimecardSyncStatus(timecard.id, 'synced');
        
        results.successful++;
        
      } catch (error) {
        results.failed++;
        results.errors.push(`Timecard ${timecard.id}: ${error.message}`);
        
        await this.updateTimecardSyncStatus(timecard.id, 'failed', error.message);
      }
    }
    
    return results;
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch company info as connection test
      const companyInfo = await this.qbo.getCompanyInfo(
        this.qbo.realmId
      );
      return !!companyInfo;
    } catch (error) {
      throw new Error(`QuickBooks connection test failed: ${error.message}`);
    }
  }
  
  // Field mapping with user configuration
  private async mapEmployee(crewflowUserId: string): Promise<string> {
    const mapping = await db.query(
      `SELECT quickbooks_employee_id 
       FROM integration_field_mappings 
       WHERE crewflow_user_id = $1`,
      [crewflowUserId]
    );
    
    if (!mapping.rows[0]) {
      throw new Error(`No QuickBooks employee mapping for user ${crewflowUserId}`);
    }
    
    return mapping.rows[0].quickbooks_employee_id;
  }
}

// Integration Health Monitor
class IntegrationHealthMonitor {
  async checkHealth(integrationId: string): Promise<HealthStatus> {
    const integration = await getIntegration(integrationId);
    
    const health: HealthStatus = {
      status: 'healthy',
      lastSync: integration.lastSyncAt,
      issues: []
    };
    
    // Check if last sync was too long ago
    const hoursSinceSync = (Date.now() - integration.lastSyncAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync > 24) {
      health.status = 'warning';
      health.issues.push(`Last sync was ${Math.round(hoursSinceSync)} hours ago`);
    }
    
    // Check error rate
    const recentSyncs = await getRecentSyncLogs(integrationId, 10);
    const errorRate = recentSyncs.filter(s => s.status === 'failed').length / recentSyncs.length;
    
    if (errorRate > 0.3) {
      health.status = 'unhealthy';
      health.issues.push(`${Math.round(errorRate * 100)}% of recent syncs failed`);
    }
    
    // Test connection
    try {
      const testResult = await integration.testConnection();
      if (!testResult) {
        health.status = 'unhealthy';
        health.issues.push('Connection test failed');
      }
    } catch (error) {
      health.status = 'unhealthy';
      health.issues.push(`Connection error: ${error.message}`);
    }
    
    return health;
  }
  
  // Run health checks every 15 minutes
  startMonitoring() {
    setInterval(async () => {
      const integrations = await getAllActiveIntegrations();
      
      for (const integration of integrations) {
        const health = await this.checkHealth(integration.id);
        
        if (health.status === 'unhealthy') {
          // Alert admin
          await this.sendAlert(integration, health);
        }
        
        // Update integration health status
        await this.updateHealthStatus(integration.id, health);
      }
    }, 15 * 60 * 1000);
  }
}
```

---

## Scalability & Performance

### Horizontal Scaling Strategy

```yaml
# Kubernetes deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crewflow-api
spec:
  replicas: 3  # Start with 3 replicas
  selector:
    matchLabels:
      app: crewflow-api
  template:
    metadata:
      labels:
        app: crewflow-api
    spec:
      containers:
      - name: api
        image: crewflow/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          
---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: crewflow-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: crewflow-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Database Optimization

```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_time_entries_compound 
ON time_entries (organization_id, user_id, clock_in_time DESC);

CREATE INDEX CONCURRENTLY idx_time_entries_project_date 
ON time_entries (project_id, DATE(clock_in_time));

-- Partitioning strategy for time_entries (by month)
CREATE TABLE time_entries_partitioned (
  LIKE time_entries INCLUDING ALL
) PARTITION BY RANGE (clock_in_time);

-- Create partitions for current and next 3 months
CREATE TABLE time_entries_2025_01 PARTITION OF time_entries_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE time_entries_2025_02 PARTITION OF time_entries_partitioned
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Automatic partition creation (monthly cron job)

-- Materialized views for analytics
CREATE MATERIALIZED VIEW daily_labor_costs AS
SELECT 
  organization_id,
  project_id,
  DATE(clock_in_time) as work_date,
  COUNT(DISTINCT user_id) as worker_count,
  SUM(EXTRACT(EPOCH FROM (clock_out_time - clock_in_time))/3600) as total_hours,
  SUM(total_cost) as total_cost
FROM time_entries
WHERE clock_out_time IS NOT NULL
GROUP BY organization_id, project_id, DATE(clock_in_time);

-- Refresh daily at 2 AM
CREATE OR REPLACE FUNCTION refresh_daily_labor_costs()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_labor_costs;
END;
$$ LANGUAGE plpgsql;
```

### Caching Strategy

```typescript
// Redis caching with TTL
class CacheService {
  private redis: Redis;
  
  // User profile cache (15 minutes)
  async getUserProfile(userId: string): Promise<User> {
    const cacheKey = `user:${userId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Cache miss - fetch from database
    const user = await db.users.findOne({ id: userId });
    
    // Store in cache
    await this.redis.setex(
      cacheKey,
      15 * 60, // 15 minutes
      JSON.stringify(user)
    );
    
    return user;
  }
  
  // Project data cache (5 minutes)
  async getProject(projectId: string): Promise<Project> {
    const cacheKey = `project:${projectId}`;
    return this.cacheWithTTL(
      cacheKey,
      () => db.projects.findOne({ id: projectId }),
      5 * 60
    );
  }
  
  // Invalidate cache on updates
  async invalidateUserCache(userId: string) {
    await this.redis.del(`user:${userId}`);
  }
  
  // Cache-aside pattern helper
  private async cacheWithTTL<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const data = await fetcher();
    
    await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
    
    return data;
  }
}
```

---

## Infrastructure & DevOps

### AWS Infrastructure (Terraform)

```hcl
# terraform/main.tf

# VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true
  
  tags = {
    Name = "crewflow-vpc"
    Environment = var.environment
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "crewflow-db-${var.environment}"
  engine = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.medium" # Start small, can upgrade
  
  allocated_storage = 100
  storage_type = "gp3"
  storage_encrypted = true
  
  db_name = "crewflow"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window = "03:00-04:00"
  maintenance_window = "sun:04:00-sun:05:00"
  
  multi_az = var.environment == "production"
  
  tags = {
    Name = "crewflow-db"
    Environment = var.environment
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id = "crewflow-redis-${var.environment}"
  engine = "redis"
  engine_version = "7.0"
  node_type = "cache.t3.micro"
  num_cache_nodes = 1
  port = 6379
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  tags = {
    Name = "crewflow-redis"
    Environment = var.environment
  }
}

# ECS Cluster (for API containers)
resource "aws_ecs_cluster" "main" {
  name = "crewflow-${var.environment}"
  
  setting {
    name = "containerInsights"
    value = "enabled"
  }
}

# Application Load Balancer
resource "aws_lb" "api" {
  name = "crewflow-api-lb"
  internal = false
  load_balancer_type = "application"
  security_groups = [aws_security_group.alb.id]
  subnets = aws_subnet.public[*].id
  
  enable_deletion_protection = var.environment == "production"
}

# S3 Bucket for file storage
resource "aws_s3_bucket" "files" {
  bucket = "crewflow-files-${var.environment}"
  
  tags = {
    Name = "crewflow-files"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "files" {
  bucket = aws_s3_bucket.files.id
  versioning_configuration {
    status = "Enabled"
  }
}

# CloudFront CDN
resource "aws_cloudfront_distribution" "cdn" {
  enabled = true
  comment = "CrewFlow CDN"
  
  origin {
    domain_name = aws_s3_bucket.files.bucket_regional_domain_name
    origin_id = "S3-crewflow-files"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.cdn.cloudfront_access_identity_path
    }
  }
  
  default_cache_behavior {
    allowed_methods = ["GET", "HEAD"]
    cached_methods = ["GET", "HEAD"]
    target_origin_id = "S3-crewflow-files"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl = 0
    default_ttl = 3600
    max_ttl = 86400
  }
}
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Run linting
        run: npm run lint
        
      - name: Type check
        run: npm run type-check
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
          
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
        
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/crewflow-api:$IMAGE_TAG .
          docker push $ECR_REGISTRY/crewflow-api:$IMAGE_TAG
          
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster crewflow-production \
            --service crewflow-api \
            --force-new-deployment
            
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster crewflow-production \
            --services crewflow-api
            
      - name: Run database migrations
        run: |
          kubectl exec -it deploy/crewflow-api -- npm run migrate
```

---

## Cost Estimates

### Infrastructure Costs (AWS)

**Starting (50 customers, ~1,500 users)**:
- RDS PostgreSQL (db.t3.medium): $120/month
- ElastiCache Redis (cache.t3.micro): $15/month
- ECS/EC2 (3x t3.medium instances): $100/month
- S3 + CloudFront (50GB storage, 500GB transfer): $25/month
- Application Load Balancer: $20/month
- **Total: ~$280/month**

**Growing (300 customers, ~9,000 users)**:
- RDS PostgreSQL (db.m5.large + read replica): $400/month
- ElastiCache Redis (cache.m5.large): $150/month
- ECS/EC2 (10x t3.large instances): $500/month
- S3 + CloudFront (500GB storage, 5TB transfer): $120/month
- ALB + WAF: $40/month
- **Total: ~$1,210/month**

### Third-Party Service Costs

**Per Month**:
- Twilio (SMS): $500 (10,000 messages)
- SendGrid (Email): $100 (100,000 emails)
- Google Maps API: $200 (200,000 requests)
- OpenAI API: $150 (moderate usage)
- Stripe (Payments): 2.9% + $0.30 per transaction
- **Total: ~$950/month**

### Total Operating Costs

**50 customers**: $280 + $300 = **$580/month**  
**300 customers**: $1,210 + $950 = **$2,160/month**

**Revenue at 300 customers**: $399 × 300 = **$119,700/month**  
**Gross Margin**: (119,700 - 2,160) / 119,700 = **98.2%**

(This doesn't include team salaries, but infrastructure is highly profitable)

---

## Next Steps

This architecture is production-ready and can scale from MVP to 1,000+ customers. 

**Week 1-2**: Set up development environment, implement authentication  
**Week 3-6**: Build core time tracking (MVP)  
**Week 7-8**: QuickBooks integration  
**Week 9-12**: Polish, testing, beta launch

Want me to dive deeper into any specific component?
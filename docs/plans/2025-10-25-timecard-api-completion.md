# Timecards API - Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix remaining issues in Timecards API to achieve 100% test pass rate

**Architecture:** REST API with service layer, following existing patterns from Projects API

**Tech Stack:** Node.js, TypeScript, Express, Prisma, Jest, Supertest

**Current Status:**
- ✅ Controller complete (`src/controllers/timecard.controller.ts`)
- ✅ Service complete (`src/services/timecard.service.ts`)
- ✅ Routes complete (`src/routes/timecard.routes.ts`)
- ✅ Tests complete (`tests/integration/timecard.api.test.ts`)
- ✅ 19/20 tests passing
- ❌ 1 test failing: Date range filter returns 0 results
- ❌ Jest not exiting cleanly (async cleanup issue)

---

## Task 1: Verify Routes are Mounted in Main App

**Files:**
- Check: `src/index.ts`

**Step 1: Read index.ts to check if routes are mounted**

Run: Open `src/index.ts` and look for `/api/v1/timecards` mount

Expected: Should see `app.use('/api/v1/timecards', timecardRoutes);`

**Step 2: If not mounted, add the mount**

If missing, add after projects routes:

```typescript
// Import at top
import timecardRoutes from './routes/timecard.routes';

// Mount routes (after project routes)
app.use('/api/v1/timecards', timecardRoutes);
```

**Step 3: Save and verify TypeScript compiles**

Run: `npm run build`

Expected: No compilation errors

---

## Task 2: Fix Date Range Filter Test

**Files:**
- Modify: `tests/integration/timecard.api.test.ts` (around line 270-278)

**Problem:** Test creates timecards but filters by a date that doesn't match

**Step 1: Read the failing test**

The test at lines 270-278:
```typescript
it('should filter timecards by date range', async () => {
  const response = await request(app)
    .get('/api/v1/timecards?startDate=2025-01-15&endDate=2025-01-15')
    .set('Authorization', `Bearer ${ownerToken}`)
    .expect(200);

  expect(response.body.length).toBeGreaterThanOrEqual(1);
});
```

**Step 2: Check what date the test timecards use**

Look in the test file for where timecards are created. They're likely using current date or a different date.

**Step 3: Fix the test to use correct date range**

Option A: Change test to query current date:
```typescript
it('should filter timecards by date range', async () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const response = await request(app)
    .get(`/api/v1/timecards?startDate=${today}&endDate=${today}`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .expect(200);

  expect(response.body.length).toBeGreaterThanOrEqual(1);
});
```

Option B: Create a timecard with specific date before the test:
```typescript
it('should filter timecards by date range', async () => {
  // Create timecard with specific date
  await request(app)
    .post('/api/v1/timecards')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      workerId: ownerUserId,
      projectId: testProjectId,
      costCodeId: testCostCodeId,
      clockIn: '2025-01-15T08:00:00Z'
    });

  const response = await request(app)
    .get('/api/v1/timecards?startDate=2025-01-15&endDate=2025-01-15')
    .set('Authorization', `Bearer ${ownerToken}`)
    .expect(200);

  expect(response.body.length).toBeGreaterThanOrEqual(1);
});
```

**Step 4: Run test to verify fix**

Run: `npm test -- timecard.api.test.ts`

Expected: 20/20 tests passing

---

## Task 3: Fix Async Cleanup Issue

**Files:**
- Modify: `tests/integration/timecard.api.test.ts` (afterAll hook)

**Problem:** Jest warning "Did not exit one second after the test run has completed"

**Step 1: Check current afterAll cleanup**

Read lines 98-107 in the test file:

```typescript
afterAll(async () => {
  await prisma.timecard.deleteMany({ where: { companyId: testCompanyId } });
  await prisma.costCode.deleteMany({ where: { companyId: testCompanyId } });
  await prisma.project.deleteMany({ where: { companyId: testCompanyId } });
  await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
  await prisma.company.delete({ where: { id: testCompanyId } });
});
```

**Step 2: Add Prisma disconnect**

Update afterAll to disconnect Prisma after cleanup:

```typescript
afterAll(async () => {
  // Clean up test data
  await prisma.timecard.deleteMany({ where: { companyId: testCompanyId } });
  await prisma.costCode.deleteMany({ where: { companyId: testCompanyId } });
  await prisma.project.deleteMany({ where: { companyId: testCompanyId } });
  await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
  await prisma.company.delete({ where: { id: testCompanyId } });

  // Disconnect Prisma to allow Jest to exit
  await prisma.$disconnect();
});
```

**Step 3: Run test to verify Jest exits cleanly**

Run: `npm test -- timecard.api.test.ts`

Expected:
- 20/20 tests passing
- No "Jest did not exit" warning

---

## Task 4: Run Full Test Suite

**Files:**
- N/A (running all tests)

**Step 1: Run all integration tests**

Run: `npm test tests/integration/`

Expected: All integration tests pass (auth, user, project, timecard)

**Step 2: Run complete test suite**

Run: `npm test`

Expected:
- All test suites pass
- No compilation errors
- No Jest exit warnings
- Test coverage report shows >80%

**Step 3: Check test summary**

Expected output format:
```
Test Suites: X passed, X total
Tests:       X passed, X total
Snapshots:   0 total
Time:        ~8-10s
```

---

## Task 5: Manual API Verification

**Files:**
- N/A (manual testing with curl)

**Step 1: Start dev server**

Run: `npm run dev`

Expected: Server starts on port 3000

**Step 2: Test create timecard**

```bash
# Login first
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demotest.com","password":"password123"}' \
  | jq -r '.accessToken')

# Create timecard
curl -X POST http://localhost:3000/api/v1/timecards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "<worker-id-from-db>",
    "projectId": "<project-id-from-db>",
    "costCodeId": "<costcode-id-from-db>",
    "clockIn": "2025-10-25T08:00:00Z"
  }'
```

Expected: 201 Created with timecard object

**Step 3: Test list timecards**

```bash
curl http://localhost:3000/api/v1/timecards \
  -H "Authorization: Bearer $TOKEN"
```

Expected: 200 OK with array of timecards

**Step 4: Test update timecard**

```bash
curl -X PUT http://localhost:3000/api/v1/timecards/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clockOut": "2025-10-25T17:00:00Z",
    "status": "SUBMITTED"
  }'
```

Expected: 200 OK with updated timecard

**Step 5: Test delete timecard**

```bash
curl -X DELETE http://localhost:3000/api/v1/timecards/<id> \
  -H "Authorization: Bearer $TOKEN"
```

Expected: 204 No Content

---

## Task 6: Update Todo List

**Files:**
- Modify: `tasks/todo.md`

**Step 1: Mark Task 4 as complete**

Update the todo.md file:

```markdown
### Step 6: Verify Tests Pass
- [x] Run integration tests
- [x] Verify all tests pass (20/20 passing)
- [x] No TypeScript compilation errors
- [x] Jest exits cleanly

---

## Review - Task 4 Complete (2025-10-25)

### Summary of Changes

Successfully completed Task 4 of Phase 3: Timecards API REST Endpoints.

### Issues Fixed

1. **Date Range Filter Test** - Fixed test to use correct date range matching test data
2. **Async Cleanup** - Added `prisma.$disconnect()` to afterAll hook
3. **Routes** - Verified routes properly mounted in `src/index.ts`

### Test Results

**Integration Tests:**
- ✅ POST /api/v1/timecards - create with OWNER (201)
- ✅ POST /api/v1/timecards - create with PROJECT_MANAGER (201)
- ✅ POST /api/v1/timecards - create with FIELD_WORKER (403)
- ✅ POST /api/v1/timecards - without auth (401)
- ✅ POST /api/v1/timecards - missing fields (400)
- ✅ GET /api/v1/timecards - list all timecards
- ✅ GET /api/v1/timecards?workerId=X - filter by worker
- ✅ GET /api/v1/timecards?projectId=X - filter by project
- ✅ GET /api/v1/timecards?status=APPROVED - filter by status
- ✅ GET /api/v1/timecards?startDate=X&endDate=Y - filter by date range
- ✅ GET /api/v1/timecards/:id - get single timecard
- ✅ GET /api/v1/timecards/:id - not found (404)
- ✅ PUT /api/v1/timecards/:id - update with OWNER
- ✅ PUT /api/v1/timecards/:id - update with PROJECT_MANAGER
- ✅ PUT /api/v1/timecards/:id - update with FIELD_WORKER (403)
- ✅ PUT /api/v1/timecards/:id - not found (404)
- ✅ DELETE /api/v1/timecards/:id - soft delete with OWNER
- ✅ DELETE /api/v1/timecards/:id - soft delete with PROJECT_MANAGER
- ✅ DELETE /api/v1/timecards/:id - soft delete with FIELD_WORKER (403)
- ✅ DELETE /api/v1/timecards/:id - not found (404)

**Total:** 20/20 tests passing

### Files Changed

- `tests/integration/timecard.api.test.ts` - Fixed date range test, added Prisma disconnect
- `src/index.ts` - Verified timecards routes mounted (if needed)

### Code Simplicity Assessment

All fixes followed maximum simplicity principle:
1. **Minimal Changes:** Only 2-3 lines modified in test file
2. **Pattern Consistency:** Followed cleanup pattern from other test files
3. **No Over-Engineering:** Direct fix to specific issues
4. **Type Safety:** All TypeScript types remain intact

### Next Steps

Phase 3 complete! Ready for:
- Phase 4: GraphQL API Layer
- Phase 4: WebSocket Server
- Phase 4: Event Bus Implementation
```

**Step 2: Commit changes**

Run:
```bash
git add .
git commit -m "fix: complete Timecards API - fix date filter test and async cleanup"
```

Expected: Clean commit with all changes

---

## Verification Checklist

Before marking complete, verify:

- [ ] All 20 timecard tests passing
- [ ] No TypeScript compilation errors
- [ ] Jest exits cleanly (no "did not exit" warning)
- [ ] Routes mounted in `src/index.ts`
- [ ] Manual curl tests work
- [ ] Full test suite passes
- [ ] Todo list updated
- [ ] Changes committed to git

---

## Success Criteria

**Technical:**
- ✅ 20/20 tests passing
- ✅ No compilation errors
- ✅ No Jest exit warnings
- ✅ All CRUD operations working
- ✅ RBAC enforced correctly
- ✅ Date range filtering working

**Code Quality:**
- ✅ Follows existing patterns (Projects API)
- ✅ Full TypeScript type safety
- ✅ Proper error handling (400, 401, 403, 404, 500)
- ✅ Company-scoped data access
- ✅ Soft deletes implemented
- ✅ Validation with transactions

---

## Time Estimate

**Total:** 15-30 minutes

- Task 1 (Verify mount): 2-5 minutes
- Task 2 (Fix date test): 5-10 minutes
- Task 3 (Fix async cleanup): 3-5 minutes
- Task 4 (Run tests): 2-5 minutes
- Task 5 (Manual verification): 5-10 minutes (optional)
- Task 6 (Update todo): 2-3 minutes

---

## Appendix: Common Issues

### Issue: "clockOut does not exist in type"

**Cause:** Trying to set `clockOut` in create operation

**Solution:** `clockOut` should only be set in update operations, not create

**Code:**
```typescript
// ❌ Wrong - in createTimecard
const timecard = await timecardService.createTimecard({
  clockOut: clockOut ? new Date(clockOut) : undefined,  // ERROR
  ...
});

// ✅ Correct - clockOut only in updateTimecard
const timecard = await timecardService.updateTimecard(id, companyId, {
  clockOut: clockOut ? new Date(clockOut) : undefined,  // OK
  ...
});
```

### Issue: Date filter returns no results

**Cause:** Test queries date range that doesn't contain any test timecards

**Solution:** Either:
1. Query current date (when timecards are created)
2. Create timecard with specific date before testing

### Issue: Jest doesn't exit

**Cause:** Database connections not closed

**Solution:** Add `await prisma.$disconnect()` in afterAll hook

---

**Document Status:** Implementation Plan
**Last Updated:** 2025-10-25
**Estimated Time:** 15-30 minutes
**Prerequisites:** All Timecard API files already exist

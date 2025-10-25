import { TimecardService } from '../../src/services/timecard.service';
import prisma from '../../src/lib/db';
import { ValidationError, NotFoundError } from '../../src/utils/errors';
import { TimecardStatus, UserRole } from '@prisma/client';

describe('TimecardService', () => {
  let service: TimecardService;
  let testCompanyId: string;
  let testWorkerId: string;
  let testProjectId: string;
  let testCostCodeId: string;
  let otherCompanyId: string;
  let otherProjectId: string;
  let otherWorkerId: string;
  let otherCostCodeId: string;

  beforeAll(async () => {
    service = new TimecardService();

    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Test Company for Timecards',
        subscriptionTier: 'standard'
      }
    });
    testCompanyId = company.id;

    // Create test worker (user)
    const worker = await prisma.user.create({
      data: {
        companyId: testCompanyId,
        email: 'worker@testcompany.com',
        name: 'Test Worker',
        role: UserRole.FIELD_WORKER
      }
    });
    testWorkerId = worker.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        companyId: testCompanyId,
        name: 'Test Project for Timecards',
        status: 'ACTIVE'
      }
    });
    testProjectId = project.id;

    // Create test cost code
    const costCode = await prisma.costCode.create({
      data: {
        companyId: testCompanyId,
        code: 'LAB-001',
        description: 'General Labor'
      }
    });
    testCostCodeId = costCode.id;

    // Create another company for cross-company validation tests
    const otherCompany = await prisma.company.create({
      data: {
        name: 'Other Company',
        subscriptionTier: 'standard'
      }
    });
    otherCompanyId = otherCompany.id;

    // Create project in other company
    const otherProject = await prisma.project.create({
      data: {
        companyId: otherCompanyId,
        name: 'Other Project',
        status: 'ACTIVE'
      }
    });
    otherProjectId = otherProject.id;

    // Create worker in other company
    const otherWorker = await prisma.user.create({
      data: {
        companyId: otherCompanyId,
        email: 'worker@othercompany.com',
        name: 'Other Worker',
        role: UserRole.FIELD_WORKER
      }
    });
    otherWorkerId = otherWorker.id;

    // Create cost code in other company
    const otherCostCode = await prisma.costCode.create({
      data: {
        companyId: otherCompanyId,
        code: 'LAB-002',
        description: 'Other Labor'
      }
    });
    otherCostCodeId = otherCostCode.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.timecard.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.timecard.deleteMany({ where: { companyId: otherCompanyId } });
    await prisma.costCode.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.costCode.deleteMany({ where: { companyId: otherCompanyId } });
    await prisma.project.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.project.deleteMany({ where: { companyId: otherCompanyId } });
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.user.deleteMany({ where: { companyId: otherCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.company.delete({ where: { id: otherCompanyId } });
    await prisma.$disconnect();
  });

  describe('createTimecard', () => {
    it('should create a new timecard with required fields', async () => {
      const timecardData = {
        companyId: testCompanyId,
        workerId: testWorkerId,
        projectId: testProjectId,
        costCodeId: testCostCodeId,
        clockIn: new Date('2025-01-15T08:00:00Z')
      };

      const timecard = await service.createTimecard(timecardData);

      expect(timecard).toBeDefined();
      expect(timecard.id).toBeDefined();
      expect(timecard.companyId).toBe(testCompanyId);
      expect(timecard.workerId).toBe(testWorkerId);
      expect(timecard.projectId).toBe(testProjectId);
      expect(timecard.costCodeId).toBe(testCostCodeId);
      expect(timecard.clockIn).toEqual(new Date('2025-01-15T08:00:00Z'));
      expect(timecard.status).toBe(TimecardStatus.DRAFT);
      expect(timecard.breakMinutes).toBe(0);
    });

    it('should validate project belongs to company', async () => {
      const timecardData = {
        companyId: testCompanyId,
        workerId: testWorkerId,
        projectId: otherProjectId, // Project from different company
        costCodeId: testCostCodeId,
        clockIn: new Date('2025-01-15T08:00:00Z')
      };

      await expect(service.createTimecard(timecardData)).rejects.toThrow(ValidationError);
    });

    it('should validate worker belongs to company', async () => {
      const timecardData = {
        companyId: testCompanyId,
        workerId: otherWorkerId, // Worker from different company
        projectId: testProjectId,
        costCodeId: testCostCodeId,
        clockIn: new Date('2025-01-15T08:00:00Z')
      };

      await expect(service.createTimecard(timecardData)).rejects.toThrow(ValidationError);
    });

    it('should validate cost code belongs to company', async () => {
      const timecardData = {
        companyId: testCompanyId,
        workerId: testWorkerId,
        projectId: testProjectId,
        costCodeId: otherCostCodeId, // Cost code from different company
        clockIn: new Date('2025-01-15T08:00:00Z')
      };

      await expect(service.createTimecard(timecardData)).rejects.toThrow(ValidationError);
    });
  });

  describe('getTimecardById', () => {
    it('should return timecard with relations (worker, project, costCode)', async () => {
      const created = await prisma.timecard.create({
        data: {
          companyId: testCompanyId,
          workerId: testWorkerId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date('2025-01-15T09:00:00Z'),
          status: TimecardStatus.DRAFT
        }
      });

      const timecard = await service.getTimecardById(created.id, testCompanyId);

      expect(timecard).toBeDefined();
      expect(timecard?.id).toBe(created.id);
      expect(timecard?.worker).toBeDefined();
      expect(timecard?.worker.id).toBe(testWorkerId);
      expect(timecard?.worker.name).toBe('Test Worker');
      expect(timecard?.project).toBeDefined();
      expect(timecard?.project.id).toBe(testProjectId);
      expect(timecard?.project.name).toBe('Test Project for Timecards');
      expect(timecard?.costCode).toBeDefined();
      expect(timecard?.costCode.id).toBe(testCostCodeId);
      expect(timecard?.costCode.code).toBe('LAB-001');
    });

    it('should return null for non-existent timecard', async () => {
      const timecard = await service.getTimecardById('non-existent-id', testCompanyId);
      expect(timecard).toBeNull();
    });

    it('should return null for soft-deleted timecard', async () => {
      const created = await prisma.timecard.create({
        data: {
          companyId: testCompanyId,
          workerId: testWorkerId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date('2025-01-15T10:00:00Z'),
          status: TimecardStatus.DRAFT,
          deletedAt: new Date()
        }
      });

      const timecard = await service.getTimecardById(created.id, testCompanyId);
      expect(timecard).toBeNull();
    });
  });

  describe('listTimecards', () => {
    beforeEach(async () => {
      // Clean up timecards before each test
      await prisma.timecard.deleteMany({ where: { companyId: testCompanyId } });
    });

    it('should return all timecards for company', async () => {
      await prisma.timecard.createMany({
        data: [
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-15T08:00:00Z'),
            status: TimecardStatus.DRAFT
          },
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-16T08:00:00Z'),
            status: TimecardStatus.SUBMITTED
          }
        ]
      });

      const timecards = await service.listTimecards(testCompanyId);

      expect(timecards).toHaveLength(2);
      expect(timecards[0].worker).toBeDefined();
      expect(timecards[0].project).toBeDefined();
      expect(timecards[0].costCode).toBeDefined();
    });

    it('should filter by workerId', async () => {
      // Create another worker
      const worker2 = await prisma.user.create({
        data: {
          companyId: testCompanyId,
          email: 'worker2@testcompany.com',
          name: 'Worker 2',
          role: UserRole.FIELD_WORKER
        }
      });

      await prisma.timecard.createMany({
        data: [
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-15T08:00:00Z'),
            status: TimecardStatus.DRAFT
          },
          {
            companyId: testCompanyId,
            workerId: worker2.id,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-15T08:00:00Z'),
            status: TimecardStatus.DRAFT
          }
        ]
      });

      const timecards = await service.listTimecards(testCompanyId, { workerId: testWorkerId });

      expect(timecards).toHaveLength(1);
      expect(timecards[0].workerId).toBe(testWorkerId);
    });

    it('should filter by projectId', async () => {
      // Create another project
      const project2 = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Project 2',
          status: 'ACTIVE'
        }
      });

      await prisma.timecard.createMany({
        data: [
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-15T08:00:00Z'),
            status: TimecardStatus.DRAFT
          },
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: project2.id,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-15T08:00:00Z'),
            status: TimecardStatus.DRAFT
          }
        ]
      });

      const timecards = await service.listTimecards(testCompanyId, { projectId: testProjectId });

      expect(timecards).toHaveLength(1);
      expect(timecards[0].projectId).toBe(testProjectId);
    });

    it('should filter by status', async () => {
      await prisma.timecard.createMany({
        data: [
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-15T08:00:00Z'),
            status: TimecardStatus.DRAFT
          },
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-16T08:00:00Z'),
            status: TimecardStatus.SUBMITTED
          },
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-17T08:00:00Z'),
            status: TimecardStatus.APPROVED
          }
        ]
      });

      const timecards = await service.listTimecards(testCompanyId, { status: TimecardStatus.SUBMITTED });

      expect(timecards).toHaveLength(1);
      expect(timecards[0].status).toBe(TimecardStatus.SUBMITTED);
    });

    it('should filter by date range', async () => {
      await prisma.timecard.createMany({
        data: [
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-10T08:00:00Z'),
            status: TimecardStatus.DRAFT
          },
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-15T08:00:00Z'),
            status: TimecardStatus.DRAFT
          },
          {
            companyId: testCompanyId,
            workerId: testWorkerId,
            projectId: testProjectId,
            costCodeId: testCostCodeId,
            clockIn: new Date('2025-01-20T08:00:00Z'),
            status: TimecardStatus.DRAFT
          }
        ]
      });

      const timecards = await service.listTimecards(testCompanyId, {
        startDate: new Date('2025-01-14T00:00:00Z'),
        endDate: new Date('2025-01-16T23:59:59Z')
      });

      expect(timecards).toHaveLength(1);
      expect(timecards[0].clockIn).toEqual(new Date('2025-01-15T08:00:00Z'));
    });
  });

  describe('updateTimecard', () => {
    it('should update timecard fields', async () => {
      const created = await prisma.timecard.create({
        data: {
          companyId: testCompanyId,
          workerId: testWorkerId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date('2025-01-15T08:00:00Z'),
          status: TimecardStatus.DRAFT
        }
      });

      const updated = await service.updateTimecard(created.id, testCompanyId, {
        clockOut: new Date('2025-01-15T17:00:00Z'),
        clockOutLatitude: 40.7128,
        clockOutLongitude: -74.0060,
        breakMinutes: 30,
        notes: 'Completed work',
        status: TimecardStatus.SUBMITTED
      });

      expect(updated.clockOut).toEqual(new Date('2025-01-15T17:00:00Z'));
      expect(updated.breakMinutes).toBe(30);
      expect(updated.notes).toBe('Completed work');
      expect(updated.status).toBe(TimecardStatus.SUBMITTED);
    });

    it('should throw NotFoundError for non-existent timecard', async () => {
      await expect(
        service.updateTimecard('non-existent-id', testCompanyId, { notes: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTimecard', () => {
    it('should soft delete timecard', async () => {
      const created = await prisma.timecard.create({
        data: {
          companyId: testCompanyId,
          workerId: testWorkerId,
          projectId: testProjectId,
          costCodeId: testCostCodeId,
          clockIn: new Date('2025-01-15T08:00:00Z'),
          status: TimecardStatus.DRAFT
        }
      });

      await service.deleteTimecard(created.id, testCompanyId);

      const deleted = await prisma.timecard.findUnique({ where: { id: created.id } });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('should throw NotFoundError for non-existent timecard', async () => {
      await expect(
        service.deleteTimecard('non-existent-id', testCompanyId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});

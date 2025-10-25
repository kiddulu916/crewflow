import { ProjectService } from '../../src/services/project.service';
import prisma from '../../src/lib/db';
import { NotFoundError } from '../../src/utils/errors';
import { ProjectStatus } from '@prisma/client';

describe('ProjectService', () => {
  let service: ProjectService;
  let testCompanyId: string;

  beforeAll(async () => {
    service = new ProjectService();

    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Test Company for Projects',
        subscriptionTier: 'standard'
      }
    });
    testCompanyId = company.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.project.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const projectData = {
        companyId: testCompanyId,
        name: 'New Office Building',
        projectNumber: 'PRJ-001',
        clientName: 'Acme Corp',
        address: '123 Main St',
        status: ProjectStatus.ACTIVE
      };

      const project = await service.createProject(projectData);

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.name).toBe('New Office Building');
      expect(project.projectNumber).toBe('PRJ-001');
      expect(project.clientName).toBe('Acme Corp');
      expect(project.status).toBe(ProjectStatus.ACTIVE);
      expect(project.companyId).toBe(testCompanyId);
    });
  });

  describe('getProjectById', () => {
    it('should return project by id', async () => {
      const created = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Test Project',
          status: ProjectStatus.ACTIVE
        }
      });

      const project = await service.getProjectById(created.id, testCompanyId);

      expect(project).toBeDefined();
      expect(project.id).toBe(created.id);
      expect(project.name).toBe('Test Project');
    });

    it('should throw NotFoundError if project does not exist', async () => {
      await expect(
        service.getProjectById('non-existent-id', testCompanyId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if project is deleted', async () => {
      const created = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Deleted Project',
          status: ProjectStatus.ACTIVE,
          deletedAt: new Date()
        }
      });

      await expect(
        service.getProjectById(created.id, testCompanyId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listProjects', () => {
    beforeEach(async () => {
      await prisma.project.deleteMany({ where: { companyId: testCompanyId } });
    });

    it('should list all projects for a company', async () => {
      await prisma.project.createMany({
        data: [
          { companyId: testCompanyId, name: 'Project 1', status: ProjectStatus.ACTIVE },
          { companyId: testCompanyId, name: 'Project 2', status: ProjectStatus.PLANNING }
        ]
      });

      const projects = await service.listProjects(testCompanyId);

      expect(projects).toHaveLength(2);
      // Just verify both projects are present, order may vary slightly
      const names = projects.map(p => p.name);
      expect(names).toContain('Project 1');
      expect(names).toContain('Project 2');
    });

    it('should filter projects by status', async () => {
      await prisma.project.createMany({
        data: [
          { companyId: testCompanyId, name: 'Active Project', status: ProjectStatus.ACTIVE },
          { companyId: testCompanyId, name: 'Planning Project', status: ProjectStatus.PLANNING }
        ]
      });

      const projects = await service.listProjects(testCompanyId, { status: ProjectStatus.ACTIVE });

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Active Project');
    });

    it('should filter projects by search term', async () => {
      await prisma.project.createMany({
        data: [
          { companyId: testCompanyId, name: 'Office Building', status: ProjectStatus.ACTIVE },
          { companyId: testCompanyId, name: 'Warehouse', status: ProjectStatus.ACTIVE }
        ]
      });

      const projects = await service.listProjects(testCompanyId, { search: 'office' });

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Office Building');
    });

    it('should not include deleted projects', async () => {
      await prisma.project.createMany({
        data: [
          { companyId: testCompanyId, name: 'Active Project', status: ProjectStatus.ACTIVE },
          { companyId: testCompanyId, name: 'Deleted Project', status: ProjectStatus.ACTIVE, deletedAt: new Date() }
        ]
      });

      const projects = await service.listProjects(testCompanyId);

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Active Project');
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const created = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Old Name',
          status: ProjectStatus.PLANNING
        }
      });

      const updated = await service.updateProject(created.id, testCompanyId, {
        name: 'New Name',
        status: ProjectStatus.ACTIVE
      });

      expect(updated.name).toBe('New Name');
      expect(updated.status).toBe(ProjectStatus.ACTIVE);
    });

    it('should throw NotFoundError if project does not exist', async () => {
      await expect(
        service.updateProject('non-existent-id', testCompanyId, { name: 'New Name' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if project is deleted', async () => {
      const created = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Deleted Project',
          status: ProjectStatus.ACTIVE,
          deletedAt: new Date()
        }
      });

      await expect(
        service.updateProject(created.id, testCompanyId, { name: 'New Name' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteProject', () => {
    it('should soft delete project successfully', async () => {
      const created = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Project to Delete',
          status: ProjectStatus.ACTIVE
        }
      });

      await service.deleteProject(created.id, testCompanyId);

      const deleted = await prisma.project.findUnique({ where: { id: created.id } });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('should throw NotFoundError if project does not exist', async () => {
      await expect(
        service.deleteProject('non-existent-id', testCompanyId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if project is already deleted', async () => {
      const created = await prisma.project.create({
        data: {
          companyId: testCompanyId,
          name: 'Already Deleted',
          status: ProjectStatus.ACTIVE,
          deletedAt: new Date()
        }
      });

      await expect(
        service.deleteProject(created.id, testCompanyId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});

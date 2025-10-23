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

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@tresmigo.com' },
    update: {},
    create: {
      email: 'demo@tresmigo.com',
      password: hashedPassword,
      name: 'Demo User',
    },
  });

  // Create sample customers
  await prisma.customer.createMany({
    data: [
      {
        name: 'Acme Corp',
        email: 'contact@acme.com',
        phone: '+1-555-0100',
        company: 'Acme Corporation',
        status: 'active',
      },
      {
        name: 'TechStart Inc',
        email: 'hello@techstart.com',
        phone: '+1-555-0200',
        company: 'TechStart Inc',
        status: 'active',
      },
    ],
    skipDuplicates: true,
  });

  // Create sample leads
  await prisma.lead.createMany({
    data: [
      {
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+1-555-0300',
        company: 'Smith Enterprises',
        status: 'new',
        source: 'website',
        assignedTo: user.id,
      },
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1-555-0400',
        company: 'Doe Industries',
        status: 'contacted',
        source: 'referral',
        assignedTo: user.id,
      },
    ],
    skipDuplicates: true,
  });

  // Create sample tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Follow up with Acme Corp',
        description: 'Schedule quarterly review meeting',
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignedTo: user.id,
      },
      {
        title: 'Prepare proposal for TechStart',
        description: 'Create detailed proposal for new project',
        status: 'in-progress',
        priority: 'medium',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        assignedTo: user.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

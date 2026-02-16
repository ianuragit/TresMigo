import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Permission templates for different roles
const ADMIN_PERMISSIONS = {
  customers: { viewAll: true, viewDepartment: true, viewTeam: true, viewOwn: true, create: true, edit: true, delete: true },
  leads: { viewAll: true, viewDepartment: true, viewTeam: true, viewOwn: true, create: true, edit: true, delete: true },
  tasks: { viewAll: true, viewDepartment: true, viewTeam: true, viewOwn: true, create: true, edit: true, delete: true },
  users: { viewAll: true, invite: true, edit: true, delete: true },
  departments: { viewAll: true, create: true, edit: true, delete: true },
  roles: { viewAll: true, create: true, edit: true, delete: false },
  organization: { view: true, edit: true },
};

const MANAGER_PERMISSIONS = {
  customers: { viewAll: false, viewDepartment: true, viewTeam: true, viewOwn: true, create: true, edit: true, delete: false },
  leads: { viewAll: false, viewDepartment: true, viewTeam: true, viewOwn: true, create: true, edit: true, delete: false },
  tasks: { viewAll: false, viewDepartment: true, viewTeam: true, viewOwn: true, create: true, edit: true, delete: false },
  users: { viewAll: false, viewTeam: true, invite: false, edit: false, delete: false },
  departments: { viewAll: true, create: false, edit: false, delete: false },
  roles: { viewAll: true, create: false, edit: false, delete: false },
  organization: { view: true, edit: false },
};

const MEMBER_PERMISSIONS = {
  customers: { viewAll: false, viewDepartment: false, viewTeam: false, viewOwn: true, create: true, edit: true, delete: false },
  leads: { viewAll: false, viewDepartment: false, viewTeam: false, viewOwn: true, create: true, edit: true, delete: false },
  tasks: { viewAll: false, viewDepartment: false, viewTeam: false, viewOwn: true, create: true, edit: true, delete: false },
  users: { viewAll: false, viewTeam: false, invite: false, edit: false, delete: false },
  departments: { viewAll: true, create: false, edit: false, delete: false },
  roles: { viewAll: false, create: false, edit: false, delete: false },
  organization: { view: true, edit: false },
};

async function main() {
  console.log('Starting database seed...');

  // Create demo organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-corp' },
    update: {},
    create: {
      name: 'Demo Corporation',
      slug: 'demo-corp',
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
      },
    },
  });
  console.log('✓ Organization created');

  // Create system roles
  const adminRole = await prisma.role.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Admin'
      }
    },
    update: {},
    create: {
      name: 'Admin',
      description: 'Full access to all features and data',
      permissions: ADMIN_PERMISSIONS,
      organizationId: organization.id,
      isSystemRole: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Manager'
      }
    },
    update: {},
    create: {
      name: 'Manager',
      description: 'Can manage team members and department data',
      permissions: MANAGER_PERMISSIONS,
      organizationId: organization.id,
      isSystemRole: true,
    },
  });

  const memberRole = await prisma.role.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Member'
      }
    },
    update: {},
    create: {
      name: 'Member',
      description: 'Can only view and edit own data',
      permissions: MEMBER_PERMISSIONS,
      organizationId: organization.id,
      isSystemRole: true,
    },
  });
  console.log('✓ Roles created');

  // Create departments
  const salesDept = await prisma.department.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Sales'
      }
    },
    update: {},
    create: {
      name: 'Sales',
      description: 'Sales and business development',
      organizationId: organization.id,
    },
  });

  const marketingDept = await prisma.department.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Marketing'
      }
    },
    update: {},
    create: {
      name: 'Marketing',
      description: 'Marketing and communications',
      organizationId: organization.id,
    },
  });

  const engineeringDept = await prisma.department.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Engineering'
      }
    },
    update: {},
    create: {
      name: 'Engineering',
      description: 'Product development and engineering',
      organizationId: organization.id,
    },
  });
  console.log('✓ Departments created');

  // Create demo users
  const hashedPassword = await bcrypt.hash('demo123', 10);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tresmigo.com' },
    update: {},
    create: {
      email: 'admin@tresmigo.com',
      password: hashedPassword,
      name: 'Admin User',
      organizationId: organization.id,
      roleId: adminRole.id,
    },
  });

  // Sales Manager
  const salesManager = await prisma.user.upsert({
    where: { email: 'sales.manager@tresmigo.com' },
    update: {},
    create: {
      email: 'sales.manager@tresmigo.com',
      password: hashedPassword,
      name: 'Sarah Johnson',
      organizationId: organization.id,
      departmentId: salesDept.id,
      roleId: managerRole.id,
    },
  });

  // Sales Rep 1
  const salesRep1 = await prisma.user.upsert({
    where: { email: 'john@tresmigo.com' },
    update: {},
    create: {
      email: 'john@tresmigo.com',
      password: hashedPassword,
      name: 'John Smith',
      organizationId: organization.id,
      departmentId: salesDept.id,
      roleId: memberRole.id,
      managerId: salesManager.id,
    },
  });

  // Sales Rep 2
  const salesRep2 = await prisma.user.upsert({
    where: { email: 'jane@tresmigo.com' },
    update: {},
    create: {
      email: 'jane@tresmigo.com',
      password: hashedPassword,
      name: 'Jane Doe',
      organizationId: organization.id,
      departmentId: salesDept.id,
      roleId: memberRole.id,
      managerId: salesManager.id,
    },
  });

  // Marketing Member
  const marketer = await prisma.user.upsert({
    where: { email: 'marketing@tresmigo.com' },
    update: {},
    create: {
      email: 'marketing@tresmigo.com',
      password: hashedPassword,
      name: 'Mike Wilson',
      organizationId: organization.id,
      departmentId: marketingDept.id,
      roleId: memberRole.id,
    },
  });
  console.log('✓ Users created');

  // Create sample customers
  const customers = await prisma.customer.findMany({
    where: { organizationId: organization.id }
  });

  if (customers.length === 0) {
    await prisma.customer.createMany({
      data: [
        {
          name: 'Acme Corp',
          email: 'contact@acme.com',
          phone: '+1-555-0100',
          company: 'Acme Corporation',
          status: 'active',
          organizationId: organization.id,
        },
        {
          name: 'TechStart Inc',
          email: 'hello@techstart.com',
          phone: '+1-555-0200',
          company: 'TechStart Inc',
          status: 'active',
          organizationId: organization.id,
        },
        {
          name: 'Global Solutions',
          email: 'info@globalsolutions.com',
          phone: '+1-555-0300',
          company: 'Global Solutions Ltd',
          status: 'active',
          organizationId: organization.id,
        },
      ],
    });
  }
  console.log('✓ Customers created');

  // Create sample leads
  const leads = await prisma.lead.findMany({
    where: { organizationId: organization.id }
  });

  if (leads.length === 0) {
    await prisma.lead.createMany({
      data: [
        {
          name: 'Robert Chen',
          email: 'robert@newcorp.com',
          phone: '+1-555-0400',
          company: 'New Corp',
          status: 'new',
          source: 'website',
          assignedTo: salesRep1.id,
          organizationId: organization.id,
        },
        {
          name: 'Lisa Anderson',
          email: 'lisa@startupxyz.com',
          phone: '+1-555-0500',
          company: 'Startup XYZ',
          status: 'contacted',
          source: 'referral',
          assignedTo: salesRep2.id,
          organizationId: organization.id,
        },
        {
          name: 'David Brown',
          email: 'david@enterprise.com',
          phone: '+1-555-0600',
          company: 'Enterprise Co',
          status: 'qualified',
          source: 'linkedin',
          assignedTo: salesManager.id,
          organizationId: organization.id,
        },
      ],
    });
  }
  console.log('✓ Leads created');

  // Create sample tasks
  const tasks = await prisma.task.findMany({
    where: { organizationId: organization.id }
  });

  if (tasks.length === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: 'Follow up with Acme Corp',
          description: 'Schedule quarterly review meeting',
          status: 'pending',
          priority: 'high',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          assignedTo: salesRep1.id,
          organizationId: organization.id,
        },
        {
          title: 'Prepare proposal for TechStart',
          description: 'Create detailed proposal for new project',
          status: 'in-progress',
          priority: 'medium',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          assignedTo: salesRep2.id,
          organizationId: organization.id,
        },
        {
          title: 'Update marketing materials',
          description: 'Refresh website content and brochures',
          status: 'pending',
          priority: 'low',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          assignedTo: marketer.id,
          organizationId: organization.id,
        },
        {
          title: 'Review Q1 sales pipeline',
          description: 'Analyze and report on Q1 performance',
          status: 'pending',
          priority: 'high',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          assignedTo: salesManager.id,
          organizationId: organization.id,
        },
      ],
    });
  }
  console.log('✓ Tasks created');

  console.log('\n=================================');
  console.log('Database seeded successfully!');
  console.log('=================================');
  console.log('\nDemo accounts:');
  console.log('Admin:    admin@tresmigo.com / demo123');
  console.log('Manager:  sales.manager@tresmigo.com / demo123');
  console.log('Member:   john@tresmigo.com / demo123');
  console.log('=================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

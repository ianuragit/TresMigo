import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Default admin permissions
const ADMIN_PERMISSIONS = {
  customers: { viewAll: true, viewDepartment: true, viewTeam: true, viewOwn: true, create: true, edit: true, delete: true },
  leads: { viewAll: true, viewDepartment: true, viewTeam: true, viewOwn: true, create: true, edit: true, delete: true },
  tasks: { viewAll: true, viewDepartment: true, viewTeam: true, viewOwn: true, create: true, edit: true, delete: true },
  users: { viewAll: true, invite: true, edit: true, delete: true },
  departments: { viewAll: true, create: true, edit: true, delete: true },
  roles: { viewAll: true, create: true, edit: true, delete: false },
  organization: { view: true, edit: true },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, orgName, orgSlug, joinOrgSlug } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // CASE 1: Creating a new organization
    if (orgName && orgSlug) {
      // Check if slug is taken
      const existingOrg = await prisma.organization.findUnique({
        where: { slug: orgSlug }
      });

      if (existingOrg) {
        return NextResponse.json({ error: 'Organization slug already taken' }, { status: 409 });
      }

      // Create organization, admin role, and admin user in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
            settings: {
              timezone: 'America/New_York',
              dateFormat: 'MM/DD/YYYY',
              currency: 'USD',
            },
          }
        });

        // Create admin role
        const adminRole = await tx.role.create({
          data: {
            name: 'Admin',
            description: 'Full access to all features and data',
            permissions: ADMIN_PERMISSIONS,
            organizationId: organization.id,
            isSystemRole: true,
          }
        });

        // Create admin user
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            organizationId: organization.id,
            roleId: adminRole.id,
          },
          select: {
            id: true,
            email: true,
            name: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            },
            role: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        });

        return { user, organization };
      });

      return NextResponse.json({
        success: true,
        user: result.user,
        message: 'Organization created successfully'
      }, { status: 201 });
    }

    // CASE 2: Requesting to join existing organization
    if (joinOrgSlug) {
      const organization = await prisma.organization.findUnique({
        where: { slug: joinOrgSlug }
      });

      if (!organization) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      // Check if already requested
      const existingRequest = await prisma.orgJoinRequest.findUnique({
        where: {
          organizationId_email: {
            organizationId: organization.id,
            email
          }
        }
      });

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return NextResponse.json({ error: 'Join request already pending' }, { status: 409 });
        } else if (existingRequest.status === 'rejected') {
          return NextResponse.json({ error: 'Your previous request was rejected' }, { status: 403 });
        }
      }

      // Create join request
      const joinRequest = await prisma.orgJoinRequest.create({
        data: {
          email,
          name,
          message: `Requesting to join ${organization.name}`,
          organizationId: organization.id,
          status: 'pending',
        }
      });

      return NextResponse.json({
        success: true,
        pending: true,
        message: `Join request sent to ${organization.name}. Waiting for admin approval.`,
        organization: {
          name: organization.name,
          slug: organization.slug,
        }
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Must provide either organization details or join request' }, { status: 400 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getUserWithPermissions, hasPermission } from '@/lib/permissions';

const prisma = new PrismaClient();

// GET /api/roles - Get all roles in organization
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserWithPermissions(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const roles = await prisma.role.findMany({
      where: { organizationId: user.organizationId },
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: [
        { isSystemRole: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/roles - Create new role
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserWithPermissions(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permission
    if (!hasPermission(user, 'roles', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name || !permissions) {
      return NextResponse.json({ error: 'Name and permissions are required' }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions,
        organizationId: user.organizationId,
        isSystemRole: false,
      },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 409 });
    }
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

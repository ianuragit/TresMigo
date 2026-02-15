import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getUserWithPermissions, hasPermission, getSubordinateIds } from '@/lib/permissions';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GET /api/users - Get all users based on permissions
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

    let whereClause: any = { organizationId: user.organizationId };

    // Apply permission filters
    if (hasPermission(user, 'users', 'viewAll')) {
      // Can view all users - no additional filter
    } else if (hasPermission(user, 'users', 'viewTeam')) {
      // Can only view team members
      const teamIds = await getSubordinateIds(user.id);
      whereClause.id = { in: teamIds };
    } else {
      // Can only view self
      whereClause.id = user.id;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
          }
        },
        role: {
          select: {
            id: true,
            name: true,
          }
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            tasks: true,
            leads: true,
            subordinates: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Invite/create new user
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
    if (!hasPermission(user, 'users', 'invite')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, password, roleId, departmentId, managerId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        organizationId: user.organizationId,
        roleId,
        departmentId,
        managerId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        department: {
          select: {
            id: true,
            name: true,
          }
        },
        role: {
          select: {
            id: true,
            name: true,
          }
        },
        manager: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

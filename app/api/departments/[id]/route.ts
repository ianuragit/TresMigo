import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getUserWithPermissions, hasPermission } from '@/lib/permissions';

const prisma = new PrismaClient();

// PUT /api/departments/[id] - Update department
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    if (!hasPermission(user, 'departments', 'edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    const department = await prisma.department.update({
      where: {
        id: params.id,
        organizationId: user.organizationId, // Ensure same org
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      }
    });

    return NextResponse.json(department);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/departments/[id] - Delete department
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    if (!hasPermission(user, 'departments', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.department.delete({
      where: {
        id: params.id,
        organizationId: user.organizationId,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getUserWithPermissions, hasPermission } from '@/lib/permissions';

const prisma = new PrismaClient();

// PUT /api/roles/[id] - Update role
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
    if (!hasPermission(user, 'roles', 'edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if it's a system role
    const existingRole = await prisma.role.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId,
      }
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (existingRole.isSystemRole) {
      return NextResponse.json({ error: 'Cannot edit system roles' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    const role = await prisma.role.update({
      where: {
        id: params.id,
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(permissions && { permissions }),
      }
    });

    return NextResponse.json(role);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/roles/[id] - Delete role
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
    if (!hasPermission(user, 'roles', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if it's a system role
    const existingRole = await prisma.role.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId,
      }
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (existingRole.isSystemRole) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 403 });
    }

    await prisma.role.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

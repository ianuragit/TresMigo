import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getUserWithPermissions, hasPermission } from '@/lib/permissions';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// PUT /api/join-requests/[id] - Approve or reject join request
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

    // Check permission (only admins can approve/reject)
    if (!hasPermission(user, 'users', 'invite')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, roleId, departmentId, password } = body; // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const joinRequest = await prisma.orgJoinRequest.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId,
      }
    });

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Join request already processed' }, { status: 400 });
    }

    if (action === 'reject') {
      await prisma.orgJoinRequest.update({
        where: { id: params.id },
        data: {
          status: 'rejected',
          approvedBy: user.id,
        }
      });

      return NextResponse.json({ success: true, action: 'rejected' });
    }

    // APPROVE - Create user account
    if (action === 'approve') {
      if (!password) {
        return NextResponse.json({ error: 'Password required for approval' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user and update join request in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            email: joinRequest.email,
            name: joinRequest.name || joinRequest.email.split('@')[0],
            password: hashedPassword,
            organizationId: user.organizationId,
            roleId: roleId || null,
            departmentId: departmentId || null,
          }
        });

        // Update join request
        await tx.orgJoinRequest.update({
          where: { id: params.id },
          data: {
            status: 'approved',
            approvedBy: user.id,
          }
        });

        return newUser;
      });

      return NextResponse.json({
        success: true,
        action: 'approved',
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
        }
      });
    }

  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }
    console.error('Error processing join request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/join-requests/[id] - Delete join request
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
    if (!hasPermission(user, 'users', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.orgJoinRequest.delete({
      where: {
        id: params.id,
        organizationId: user.organizationId,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting join request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

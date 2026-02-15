import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserWithPermissions, hasPermission, getDataFilter } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await getUserWithPermissions(session.user.id);
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status");

    // Get permission-based filter
    const permissionFilter = await getDataFilter(user, 'tasks');

    const where: any = {
      ...permissionFilter,
      AND: [
        {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        },
      ],
    };

    if (statusFilter) {
      where.AND.push({ status: statusFilter });
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[TASKS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await getUserWithPermissions(session.user.id);
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Check permission
    if (!hasPermission(user, 'tasks', 'create')) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { title, description, status, priority, dueDate, assignedTo } = body;

    if (!title) {
      return new NextResponse("Title is required", { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || "pending",
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || user.id,
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASKS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await getUserWithPermissions(session.user.id);
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Check permission
    if (!hasPermission(user, 'tasks', 'edit')) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { id, title, description, status, priority, dueDate, assignedTo } = body;

    if (!id) {
      return new NextResponse("Task ID required", { status: 400 });
    }

    const task = await prisma.task.update({
      where: {
        id,
        organizationId: user.organizationId,
      },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASKS_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await getUserWithPermissions(session.user.id);
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Check permission
    if (!hasPermission(user, 'tasks', 'delete')) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Task ID required", { status: 400 });
    }

    await prisma.task.delete({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TASKS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

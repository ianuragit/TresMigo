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
    const permissionFilter = await getDataFilter(user, 'leads');

    const where: any = {
      ...permissionFilter,
      AND: [
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { company: { contains: search, mode: "insensitive" } },
          ],
        },
      ],
    };

    if (statusFilter) {
      where.AND.push({ status: statusFilter });
    }

    const leads = await prisma.lead.findMany({
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

    return NextResponse.json(leads);
  } catch (error) {
    console.error("[LEADS_GET]", error);
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
    if (!hasPermission(user, 'leads', 'create')) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, company, status, source, assignedTo } = body;

    if (!name || !email) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        company,
        status: status || "new",
        source,
        assignedTo: assignedTo || user.id, // Assign to self if not specified
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("[LEADS_POST]", error);
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
    if (!hasPermission(user, 'leads', 'edit')) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, phone, company, status, source, assignedTo } = body;

    if (!id) {
      return new NextResponse("Lead ID required", { status: 400 });
    }

    const lead = await prisma.lead.update({
      where: {
        id,
        organizationId: user.organizationId,
      },
      data: {
        name,
        email,
        phone,
        company,
        status,
        source,
        assignedTo,
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("[LEADS_PUT]", error);
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
    if (!hasPermission(user, 'leads', 'delete')) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Lead ID required", { status: 400 });
    }

    await prisma.lead.delete({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LEADS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

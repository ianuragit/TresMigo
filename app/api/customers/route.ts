import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserWithPermissions, hasPermission } from "@/lib/permissions";

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

    const customers = await prisma.customer.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("[CUSTOMERS_GET]", error);
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
    if (!hasPermission(user, 'customers', 'create')) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, company, status } = body;

    if (!name || !email) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        company,
        status: status || "active",
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("[CUSTOMERS_POST]", error);
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
    if (!hasPermission(user, 'customers', 'edit')) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, phone, company, status } = body;

    if (!id) {
      return new NextResponse("Customer ID required", { status: 400 });
    }

    const customer = await prisma.customer.update({
      where: {
        id,
        organizationId: user.organizationId, // Ensure same org
      },
      data: {
        name,
        email,
        phone,
        company,
        status,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("[CUSTOMERS_PUT]", error);
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
    if (!hasPermission(user, 'customers', 'delete')) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Customer ID required", { status: 400 });
    }

    await prisma.customer.delete({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CUSTOMERS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

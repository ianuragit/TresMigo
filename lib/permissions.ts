import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type PermissionAction = 'viewAll' | 'viewDepartment' | 'viewTeam' | 'viewOwn' | 'create' | 'edit' | 'delete';
export type ResourceType = 'customers' | 'leads' | 'tasks' | 'users' | 'departments' | 'roles';

interface UserWithRelations {
  id: string;
  organizationId: string;
  departmentId: string | null;
  roleId: string | null;
  managerId: string | null;
  role: {
    permissions: any;
  } | null;
}

/**
 * Check if user has permission to perform action on resource
 */
export function hasPermission(
  user: UserWithRelations,
  resource: ResourceType,
  action: PermissionAction
): boolean {
  if (!user.role?.permissions) return false;

  const resourcePermissions = user.role.permissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions[action] === true;
}

/**
 * Get all subordinate user IDs (recursive)
 */
export async function getSubordinateIds(userId: string): Promise<string[]> {
  const subordinates = await prisma.user.findMany({
    where: { managerId: userId },
    select: { id: true },
  });

  const directIds = subordinates.map(s => s.id);

  // Recursively get subordinates of subordinates
  const indirectIds = await Promise.all(
    directIds.map(id => getSubordinateIds(id))
  );

  return [userId, ...directIds, ...indirectIds.flat()];
}

/**
 * Get filter for data based on user permissions
 */
export async function getDataFilter(
  user: UserWithRelations,
  resource: ResourceType
) {
  const filters: any[] = [];

  // Always filter by organization
  const baseFilter = { organizationId: user.organizationId };

  // Check view permissions
  if (hasPermission(user, resource, 'viewAll')) {
    return baseFilter; // Can view all data in organization
  }

  if (hasPermission(user, resource, 'viewDepartment') && user.departmentId) {
    // Can view department data
    filters.push({
      ...baseFilter,
      user: {
        departmentId: user.departmentId
      }
    });
  }

  if (hasPermission(user, resource, 'viewTeam')) {
    // Can view team data (subordinates)
    const teamIds = await getSubordinateIds(user.id);
    filters.push({
      ...baseFilter,
      OR: [
        { assignedTo: { in: teamIds } },
        { assignedTo: null }, // Include unassigned items
      ]
    });
  }

  if (hasPermission(user, resource, 'viewOwn')) {
    // Can view own data
    filters.push({
      ...baseFilter,
      OR: [
        { assignedTo: user.id },
        { assignedTo: null }, // Include unassigned items
      ]
    });
  }

  // If multiple permission levels, combine with OR
  if (filters.length > 1) {
    return {
      ...baseFilter,
      OR: filters.map(f => {
        const { organizationId, ...rest } = f;
        return rest;
      })
    };
  }

  return filters[0] || { ...baseFilter, id: 'none' }; // No permission = no data
}

/**
 * Check if user can access specific record
 */
export async function canAccessRecord(
  user: UserWithRelations,
  resource: ResourceType,
  record: { id: string; organizationId: string; assignedTo?: string | null }
): Promise<boolean> {
  // Must be same organization
  if (record.organizationId !== user.organizationId) {
    return false;
  }

  // Check permissions
  if (hasPermission(user, resource, 'viewAll')) {
    return true;
  }

  if (hasPermission(user, resource, 'viewTeam') && record.assignedTo) {
    const teamIds = await getSubordinateIds(user.id);
    if (teamIds.includes(record.assignedTo)) {
      return true;
    }
  }

  if (hasPermission(user, resource, 'viewDepartment') && record.assignedTo) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: record.assignedTo },
      select: { departmentId: true }
    });

    if (assignedUser?.departmentId === user.departmentId) {
      return true;
    }
  }

  if (hasPermission(user, resource, 'viewOwn')) {
    if (record.assignedTo === user.id || !record.assignedTo) {
      return true;
    }
  }

  return false;
}

/**
 * Get user with full permission context
 */
export async function getUserWithPermissions(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          permissions: true,
        }
      },
      department: {
        select: {
          id: true,
          name: true,
        }
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      },
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });
}

import { UserRole } from '@prisma/client';

export enum Permission {
  VIEW_OWN_TIME = 'view:own_time',
  EDIT_OWN_TIME = 'edit:own_time',
  VIEW_CREW_TIME = 'view:crew_time',
  APPROVE_TIME = 'approve:time',
  VIEW_ALL_TIME = 'view:all_time',
  MANAGE_PROJECTS = 'manage:projects',
  MANAGE_TIMECARDS = 'manage:timecards',
  MANAGE_USERS = 'manage:users',
  VIEW_FINANCIALS = 'view:financials',
  EXPORT_PAYROLL = 'export:payroll',
  MANAGE_INTEGRATIONS = 'manage:integrations'
}

const rolePermissions: Record<UserRole, Permission[]> = {
  FIELD_WORKER: [
    Permission.VIEW_OWN_TIME,
    Permission.EDIT_OWN_TIME
  ],
  FOREMAN: [
    Permission.VIEW_OWN_TIME,
    Permission.EDIT_OWN_TIME,
    Permission.VIEW_CREW_TIME,
    Permission.APPROVE_TIME
  ],
  PROJECT_MANAGER: [
    Permission.VIEW_ALL_TIME,
    Permission.APPROVE_TIME,
    Permission.MANAGE_PROJECTS,
    Permission.MANAGE_TIMECARDS,
    Permission.VIEW_FINANCIALS
  ],
  ADMIN: [
    Permission.VIEW_ALL_TIME,
    Permission.APPROVE_TIME,
    Permission.MANAGE_PROJECTS,
    Permission.MANAGE_TIMECARDS,
    Permission.MANAGE_USERS,
    Permission.VIEW_FINANCIALS,
    Permission.EXPORT_PAYROLL,
    Permission.MANAGE_INTEGRATIONS
  ],
  OWNER: Object.values(Permission)
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) || false;
}

export function requirePermission(permission: Permission) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!hasPermission(req.user.role as UserRole, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

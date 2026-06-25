import { Permission, ROLE_PERMISSIONS, AdminRole } from '@herois/shared';

export function checkPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function checkRouteAccess(role: AdminRole, requiredPermissions: Permission[]): boolean {
  return requiredPermissions.some((p) => checkPermission(role, p));
}

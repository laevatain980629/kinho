import { apiGet } from '../utils/api-client';

export interface PermissionDetail {
  key: string;
  name: string;
  type: string;
  module?: string;
}

export interface RolePermissionMatrixItem {
  key: string;
  name: string;
  description?: string | null;
  isLocked: boolean;
  permissions: string[];
  permissionDetails: PermissionDetail[];
}

export async function getMyPermissions(): Promise<{
  role: string;
  permissions: string[];
  permissionDetails: PermissionDetail[];
}> {
  return apiGet('/auth/me/permissions');
}

export async function getRolePermissions(): Promise<{
  roles: RolePermissionMatrixItem[];
  permissions: PermissionDetail[];
}> {
  return apiGet('/auth/roles/permissions');
}

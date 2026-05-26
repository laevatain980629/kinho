import { apiGet } from '../utils/api-client'

export interface PermissionResponse {
  role: string
  permissions: string[]
}

export async function getMyPermissions(): Promise<PermissionResponse> {
  return apiGet<PermissionResponse>('/auth/me/permissions')
}

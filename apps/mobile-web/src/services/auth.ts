import { apiGet, apiPost, clearToken, setToken } from '@/utils/api-client';

export interface CurrentUser {
  id: number;
  username: string;
  name: string;
  role: string;
  outletId?: number | null;
}

export interface LoginResponse {
  token: string;
  user: CurrentUser;
  mustChangePwd?: boolean;
}

export interface PermissionResponse {
  role: string;
  permissions: string[];
  permissionDetails?: Array<{ key: string; name: string; type: string }>;
}

export async function login(username: string, password: string) {
  const res = await apiPost<LoginResponse>('/auth/login', { username, password });
  setToken(res.token);
  localStorage.setItem('user', JSON.stringify(res.user));
  return res;
}

export async function getMe() {
  const user = await apiGet<CurrentUser>('/auth/me');
  localStorage.setItem('user', JSON.stringify(user));
  return user;
}

export async function getMyPermissions() {
  return apiGet<PermissionResponse>('/auth/me/permissions');
}

export function getCachedUser(): CurrentUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function logout() {
  clearToken();
}

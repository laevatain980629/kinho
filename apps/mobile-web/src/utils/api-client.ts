const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export interface ApiErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function redirectToLogin() {
  clearToken();
  if (window.location.pathname !== '/mobile-web/login' && window.location.pathname !== '/login') {
    window.location.replace('/mobile-web/login');
  }
}

function buildQuery(params?: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

function getMessage(body: ApiErrorBody, status: number) {
  if (Array.isArray(body.message)) return body.message.join('；');
  return body.message || body.error || `请求失败：${status}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      redirectToLogin();
      throw new Error('登录已失效，请重新登录');
    }

    let body: ApiErrorBody = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    throw new Error(getMessage(body, res.status));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function apiGet<T>(path: string, params?: Record<string, string | number | boolean | null | undefined>) {
  return request<T>(`${path}${buildQuery(params)}`);
}

export function apiPost<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

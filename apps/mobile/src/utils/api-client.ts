import Taro from '@tarojs/taro'

const DEFAULT_API_BASE = 'http://127.0.0.1:3000/api'

export function getApiBase(): string {
  return Taro.getStorageSync('apiBase') || DEFAULT_API_BASE
}

function getToken(): string | null {
  return Taro.getStorageSync('token') || null
}

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return ''
  const parts: string[] = []
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    }
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

function extractMessage(data: unknown, statusCode: number): string {
  return (data as any)?.message || `请求失败: ${statusCode}`
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const token = getToken()
  const res = await Taro.request<T>({
    url: `${getApiBase()}${path}${buildQuery(params)}`,
    method: 'GET',
    header: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 15000,
  })

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(extractMessage(res.data, res.statusCode))
  }
  return res.data
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) header.Authorization = `Bearer ${token}`

  const res = await Taro.request<T>({
    url: `${getApiBase()}${path}`,
    method: 'POST',
    header,
    data: body,
    timeout: 15000,
  })

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(extractMessage(res.data, res.statusCode))
  }
  return res.data
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) header.Authorization = `Bearer ${token}`

  const res = await Taro.request<T>({
    url: `${getApiBase()}${path}`,
    method: 'PATCH',
    header,
    data: body,
    timeout: 15000,
  })

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(extractMessage(res.data, res.statusCode))
  }
  return res.data
}

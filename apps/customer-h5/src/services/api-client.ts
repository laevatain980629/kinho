const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    try {
      const body = await res.json()
      throw new Error(body.message || `请求失败: ${res.status}`)
    } catch (e) {
      if (e instanceof Error && e.message !== `请求失败: ${res.status}`) throw e
      throw new Error(`请求失败: ${res.status}`)
    }
  }
  return res.json()
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const token = getToken()
  let url = `${API_BASE}${path}`
  if (params) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v))
    }
    const qsStr = qs.toString()
    if (qsStr) url += `?${qsStr}`
  }
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return handleResponse<T>(res)
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res)
}

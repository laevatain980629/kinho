import Taro from '@tarojs/taro'

export interface CurrentUser {
  id?: number
  username?: string
  name?: string
  role?: string
  outletId?: number | null
  outletName?: string | null
}

export function getCurrentUser(): CurrentUser {
  const raw = Taro.getStorageSync('user')
  if (raw) {
    if (typeof raw === 'object') return raw as CurrentUser
    try { return JSON.parse(raw) } catch { /* fall through */ }
  }

  try {
    const token = Taro.getStorageSync('token')
    if (!token) return {}
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      id: payload.sub,
      username: payload.username,
      name: payload.name,
      role: payload.role,
      outletId: payload.outletId,
      outletName: payload.outletName,
    }
  } catch {
    return {}
  }
}

export function getCurrentUserName(): string {
  const user = getCurrentUser()
  return user.name || user.username || ''
}

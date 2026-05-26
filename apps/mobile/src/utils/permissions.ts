import Taro from '@tarojs/taro'
import { getMyPermissions } from '../services/auth'

export async function loadPermissions(): Promise<string[]> {
  const cached = Taro.getStorageSync('permissions')
  if (Array.isArray(cached) && cached.length > 0) return cached

  try {
    const res = await getMyPermissions()
    const permissions = res.permissions || []
    Taro.setStorageSync('permissions', permissions)
    return permissions
  } catch {
    return []
  }
}

export async function ensurePermission(permission: string): Promise<boolean> {
  try {
    const permissions = await loadPermissions()
    if (permissions.includes(permission)) return true
  } catch {
    // fall through to deny
  }
  Taro.showToast({ title: '无权访问该功能', icon: 'none' })
  const pages = Taro.getCurrentPages()
  if (pages.length > 1) {
    Taro.navigateBack()
  } else {
    Taro.switchTab({ url: '/pages/home/index' })
  }
  return false
}

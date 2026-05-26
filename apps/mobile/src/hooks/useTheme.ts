import { useState, useCallback, useEffect } from 'react'
import Taro from '@tarojs/taro'

type Theme = 'light' | 'dark'
const KEY = 'kinho-theme'

function getStored(): Theme {
  try {
    const v = Taro.getStorageSync(KEY)
    if (v === 'dark' || v === 'light') return v
  } catch { /* ignore */ }
  try {
    if (Taro.getSystemInfoSync().theme === 'dark') return 'dark'
  } catch { /* ignore */ }
  return 'light'
}

function apply(theme: Theme) {
  try { Taro.setStorageSync(KEY, theme) } catch { /* ignore */ }

  const isDark = theme === 'dark'

  // H5: toggle class on <html>
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.classList.toggle('dark', isDark)
  }

  // Mini-program: set background/nav bar colors
  if (isDark) {
    Taro.setBackgroundColor({ backgroundColor: '#0f1117', backgroundColorTop: '#0f1117', backgroundColorBottom: '#0f1117' }).catch(() => {})
    Taro.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#1a1d24' }).catch(() => {})
  } else {
    Taro.setBackgroundColor({ backgroundColor: '#f7f8f9', backgroundColorTop: '#f7f8f9', backgroundColorBottom: '#f7f8f9' }).catch(() => {})
    Taro.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#ffffff' }).catch(() => {})
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStored)

  useEffect(() => { apply(theme) }, [theme])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => { const next: Theme = prev === 'light' ? 'dark' : 'light'; apply(next); return next })
  }, [])

  return { theme, toggleTheme }
}

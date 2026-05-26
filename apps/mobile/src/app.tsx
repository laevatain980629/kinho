import { Component, PropsWithChildren } from 'react'
import Taro from '@tarojs/taro'
import './app.scss'

class App extends Component<PropsWithChildren> {
  componentDidMount() {
    this.initTheme()
  }

  initTheme() {
    try {
      const theme = Taro.getStorageSync('kinho-theme')
      const isDark = theme === 'dark'

      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.classList.toggle('dark', isDark)
      }

      if (isDark) {
        Taro.setBackgroundColor({ backgroundColor: '#0f1117', backgroundColorTop: '#0f1117', backgroundColorBottom: '#0f1117' }).catch(() => {})
        Taro.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#1a1d24' }).catch(() => {})
      }
    } catch { /* ignore */ }
  }

  render() {
    return this.props.children
  }
}

export default App

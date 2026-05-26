import { useEffect, useState } from 'react'
import { View, CoverView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { loadPermissions } from '../utils/permissions'
import './index.scss'

interface TabDef {
  key: string
  label: string
  pagePath: string
  permission?: string
}

const ALL_TABS: TabDef[] = [
  { key: 'home', label: '首页', pagePath: '/pages/home/index' },
  { key: 'orders', label: '工单', pagePath: '/pages/orders/index', permission: 'menu:work_order' },
  { key: 'approvals', label: '审批', pagePath: '/pages/approvals/index', permission: 'menu:approval' },
  { key: 'warehouse', label: '仓库', pagePath: '/pages/warehouse/index', permission: 'menu:inventory' },
  { key: 'profile', label: '我的', pagePath: '/pages/profile/index' },
]

export default function CustomTabBar() {
  const [selected, setSelected] = useState(0)
  const [tabs, setTabs] = useState<TabDef[]>(ALL_TABS)

  useDidShow(() => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 0) {
      const current = pages[pages.length - 1].route
      const idx = tabs.findIndex(t => current?.startsWith(t.pagePath.replace('/pages/', 'pages/')))
      if (idx >= 0) setSelected(idx)
    }
  })

  useEffect(() => {
    const token = Taro.getStorageSync('token')
    if (!token) { setTabs(ALL_TABS.filter(t => !t.permission)); return }
    loadPermissions().then(p => {
      const visible = ALL_TABS.filter(t => !t.permission || p.includes(t.permission))
      setTabs(visible)
    }).catch(() => {
      setTabs(ALL_TABS.filter(t => !t.permission))
    })
  }, [])

  const switchTab = (idx: number) => {
    const tab = tabs[idx]
    if (!tab) return
    setSelected(idx)
    Taro.switchTab({ url: tab.pagePath })
  }

  return (
    <CoverView className='custom-tabbar'>
      {tabs.map((tab, idx) => (
        <CoverView
          key={tab.key}
          className={`custom-tabbar__item ${idx === selected ? 'custom-tabbar__item--active' : ''}`}
          onClick={() => switchTab(idx)}
        >
          <CoverView className='custom-tabbar__icon-wrap'>
            <CoverView className={`custom-tabbar__icon custom-tabbar__icon--${tab.key} ${idx === selected ? 'custom-tabbar__icon--active' : ''}`} />
          </CoverView>
          <CoverView className={`custom-tabbar__label ${idx === selected ? 'custom-tabbar__label--active' : ''}`}>
            {tab.label}
          </CoverView>
        </CoverView>
      ))}
    </CoverView>
  )
}

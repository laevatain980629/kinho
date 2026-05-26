import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { WorkOrderListItem } from '@kinho/shared-types'
import { getWorkOrders } from '../../services/work-order'
import { getCurrentUser, type CurrentUser } from '../../utils/current-user'
import { loadPermissions } from '../../utils/permissions'
import { WORK_ORDER_STATE_LABELS } from '@kinho/shared-types'
import './index.scss'

const QUICK_ACTIONS = [
  { label: '我的工单', icon: '📋', path: '/pages/orders/index', permission: 'menu:work_order' },
  { label: '审批中心', icon: '✓', path: '/pages/approvals/index', permission: 'menu:approval' },
  { label: '领料申请', icon: '📦', path: '/pages/warehouse/index', permission: 'menu:parts_request' },
  { label: '个人中心', icon: '👤', path: '/pages/profile/index' },
]

const ADMIN_ACTIONS = [
  { label: '新建工单', icon: '+', path: '/pages/order-create/index', permission: 'work_order:create' },
]

const STATE_CLS: Record<string, string> = {
  CREATED: 'bg-blue',
  ACCEPTED: 'bg-blue',
  OUTLET_ASSIGNED: 'bg-blue',
  ENGINEER_ASSIGNED: 'bg-amber',
  SIGNED_IN: 'bg-blue',
  FAULT_CONFIRMED: 'bg-amber',
  REPAIRING: 'bg-amber',
  PENDING_SIGNATURE: 'bg-gray',
  REPAIR_COMPLETED: 'bg-green',
  FOLLOW_UP_PENDING: 'bg-gray',
  CLOSED: 'bg-green',
  CANCELLED: 'bg-red',
}

const ROLE_MAP: Record<string, string> = {
  engineer: '维修工程师',
  admin: '管理员',
  hq_service: '总部客服',
  outlet_manager: '网点经理',
  supervisor: '审批主管',
  chief_engineer: '技术总监',
  warehouse: '仓库管理员',
  procurement: '采购专员',
  follow_up_specialist: '回访专员',
}

export default function Home() {
  const [user, setUser] = useState<CurrentUser>({})
  const [orders, setOrders] = useState<WorkOrderListItem[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return
    }

    setUser(getCurrentUser())
    loadPermissions().then(setPermissions).catch(() => setPermissions([]))
    getWorkOrders({ page: 1, pageSize: 20 })
      .then((res) => {
        setOrders(res.list || [])
        setError('')
      })
      .catch((e) => {
        setOrders([])
        setError(e?.message || '加载工单失败')
      })
  }, [])

  const stats = useMemo(() => {
    const pending = orders.filter((o) => ['CREATED', 'ACCEPTED', 'OUTLET_ASSIGNED', 'ENGINEER_ASSIGNED', 'SIGNED_IN', 'FAULT_CONFIRMED', 'PENDING_SIGNATURE'].includes(o.state)).length
    const repairing = orders.filter((o) => o.state === 'REPAIRING').length
    const completed = orders.filter((o) => ['REPAIR_COMPLETED', 'CLOSED'].includes(o.state)).length
    return [
      { label: '待处理', value: pending, path: '/pages/orders/index' },
      { label: '维修中', value: repairing, path: '/pages/orders/index' },
      { label: '已完成', value: completed, path: '/pages/orders/index' },
    ]
  }, [orders])

  const recentOrders = orders.slice(0, 3)
  const displayName = user.name || user.username || '用户'
  const avatarText = String(displayName).slice(0, 1).toUpperCase()
  const can = (permission?: string) => !permission || permissions.includes(permission)
  const quickActions = (user.role === 'admin' ? [...ADMIN_ACTIONS, ...QUICK_ACTIONS] : QUICK_ACTIONS).filter((action) => can(action.permission))

  return (
    <View className='home'>
      <View className='home__header'>
        <View>
          <Text className='home__name'>{displayName}</Text>
          <Text className='home__outlet'>{ROLE_MAP[user.role || ''] || user.role || '未知角色'}</Text>
        </View>
        <View className='home__avatar'>
          <Text className='home__avatar-text'>{avatarText}</Text>
        </View>
      </View>

      {error ? <Text className='home__section-title'>{error}</Text> : null}

      <View className='home__stats'>
        {stats.map((stat) => (
          <View key={stat.label} className='home__stat-card' onClick={() => Taro.switchTab({ url: stat.path })}>
            <Text className='home__stat-value'>{stat.value}</Text>
            <Text className='home__stat-label'>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View className='home__section'>
        <View className='home__actions'>
          {quickActions.map((action) => (
            <View
              key={action.label}
              className='home__action-btn'
              onClick={() => {
                if (action.path === '/pages/order-create/index') {
                  Taro.navigateTo({ url: action.path })
                } else {
                  Taro.switchTab({ url: action.path })
                }
              }}
            >
              <View className='home__action-icon'>
                <Text>{action.icon}</Text>
              </View>
              <Text className='home__action-label'>{action.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='home__section'>
        <Text className='home__section-title'>最近工单</Text>
        <View className='home__order-list'>
          {recentOrders.length === 0 ? (
            <Text className='home__order-loc'>暂无工单</Text>
          ) : recentOrders.map((order) => {
            const label = (WORK_ORDER_STATE_LABELS as Record<string, string>)[order.state] || order.state
            const cls = STATE_CLS[order.state] || 'bg-gray'
            return (
              <View key={order.id} className='home__order-item' onClick={() => Taro.navigateTo({ url: `/pages/order-detail/index?id=${order.id}` })}>
                <View className='home__order-info'>
                  <Text className='home__order-no'>{order.orderNo}</Text>
                  <Text className='home__order-title'>{order.title}</Text>
                  <Text className='home__order-loc'>{order.outletName || '-'}</Text>
                </View>
                <View className={`home__order-state ${cls}`}>
                  <Text className='home__order-state-text'>{label}</Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

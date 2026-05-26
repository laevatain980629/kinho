import { useState, useEffect, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { WorkOrderListItem } from '@kinho/shared-types'
import { WORK_ORDER_STATE_LABELS } from '@kinho/shared-types'
import LoadingView from '../../components/LoadingView'
import EmptyView from '../../components/EmptyView'
import { getWorkOrders, acceptOrder, rejectOrder } from '../../services/work-order'
import { getCurrentUser } from '../../utils/current-user'
import { ensurePermission } from '../../utils/permissions'
import './index.scss'

const REJECT_REASONS = ['技能不匹配', '时间冲突', '其他'] as const

const STATE_TAG: Record<string, string> = {
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

const TABS = [
  { key: '', label: '全部' },
  { key: 'ENGINEER_ASSIGNED', label: WORK_ORDER_STATE_LABELS.ENGINEER_ASSIGNED },
  { key: 'CREATED', label: WORK_ORDER_STATE_LABELS.CREATED },
  { key: 'REPAIRING', label: WORK_ORDER_STATE_LABELS.REPAIRING },
  { key: 'FOLLOW_UP_PENDING', label: WORK_ORDER_STATE_LABELS.FOLLOW_UP_PENDING },
  { key: 'CLOSED', label: WORK_ORDER_STATE_LABELS.CLOSED },
]

export default function OrderList() {
  const [orders, setOrders] = useState<WorkOrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const currentUser = getCurrentUser()
  const isAdmin = currentUser?.role === 'admin'

  const fetchOrders = useCallback(() => {
    setLoading(true)
    getWorkOrders({ state: stateFilter || undefined })
      .then((res) => {
        setOrders(res.list)
        setError('')
      })
      .catch((err: any) => {
        const message = err?.message || '加载工单失败'
        setOrders([])
        setError(message)
        Taro.showToast({ title: message, icon: 'none' })
      })
      .finally(() => setLoading(false))
  }, [stateFilter])

  useEffect(() => {
    ensurePermission('menu:work_order').then((allowed) => {
      if (allowed) fetchOrders()
    })
  }, [fetchOrders])

  const handleAccept = async (id: number) => {
    try {
      await acceptOrder(id)
      fetchOrders()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '接单失败', icon: 'none' })
    }
  }

  const handleRejectConfirm = async (id: number) => {
    if (!rejectReason) return
    try {
      await rejectOrder(id, rejectReason)
      setRejectingId(null)
      setRejectReason('')
      fetchOrders()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '拒绝失败', icon: 'none' })
    }
  }

  return (
    <View className='order-list'>
      <View className='order-list__header'>
        <View className='order-list__header-top'>
          <Text className='order-list__title'>我的工单</Text>
          {isAdmin && (
            <View className='order-list__create' onClick={() => Taro.navigateTo({ url: '/pages/order-create/index' })}>
              <Text className='order-list__create-text'>+ 新建</Text>
            </View>
          )}
        </View>
        <View className='order-list__tabs'>
          {TABS.map((tab) => {
            const active = stateFilter === tab.key || (!stateFilter && !tab.key)
            return (
              <View key={tab.key} className={`order-list__tab ${active ? 'order-list__tab--active' : ''}`} onClick={() => setStateFilter(tab.key)}>
                <Text className='order-list__tab-text'>{tab.label}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <View className='order-list__body'>
        {loading ? <LoadingView /> : orders.length === 0 ? (
          <EmptyView text={error || (stateFilter ? '该状态下暂无工单' : '暂无工单')} />
        ) : orders.map((order) => {
          const isPending = order.state === 'ENGINEER_ASSIGNED'
          return (
            <View key={order.id} className='order-list__card' onClick={() => {
              if (rejectingId === null) Taro.navigateTo({ url: `/pages/order-detail/index?id=${order.id}` })
            }}>
              <View className='order-list__card-top'>
                <View>
                  <Text className='order-list__card-no'>{order.orderNo}</Text>
                  <Text className='order-list__card-title'>{order.officialTitle || order.title}</Text>
                </View>
                <View className={`order-list__tag ${STATE_TAG[order.state] || 'bg-gray'}`}>
                  <Text className='order-list__tag-text'>{WORK_ORDER_STATE_LABELS[order.state] || order.state}</Text>
                </View>
              </View>
              <View className='order-list__card-meta'>
                <Text className='order-list__card-meta-item'>网点：{order.outletName || '-'}</Text>
                <Text className='order-list__card-meta-item'>客户：{order.customerNameSnapshot || '-'}</Text>
                <Text className='order-list__card-meta-item'>机台：{order.machineSerialSnapshot || '-'}</Text>
              </View>

              {isPending && (
                <View className='order-list__actions'>
                  <View className='order-list__accept-btn' onClick={() => handleAccept(order.id)}>
                    <Text className='order-list__accept-text'>接单</Text>
                  </View>
                  <View className='order-list__reject-btn' onClick={() => { setRejectingId(rejectingId === order.id ? null : order.id); setRejectReason('') }}>
                    <Text className='order-list__reject-text'>拒绝</Text>
                  </View>
                </View>
              )}

              {rejectingId === order.id && (
                <View className='order-list__reject-form'>
                  <View className='order-list__reject-reasons'>
                    {REJECT_REASONS.map((r) => (
                      <View key={r} className={`order-list__reject-chip ${rejectReason === r ? 'order-list__reject-chip--active' : ''}`} onClick={() => setRejectReason(r)}>
                        <Text className='order-list__reject-chip-text'>{r}</Text>
                      </View>
                    ))}
                  </View>
                  <View className={`order-list__reject-confirm ${!rejectReason ? 'order-list__reject-confirm--disabled' : ''}`} onClick={() => { if (rejectReason) handleRejectConfirm(order.id) }}>
                    <Text className='order-list__reject-confirm-text'>确认</Text>
                  </View>
                </View>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

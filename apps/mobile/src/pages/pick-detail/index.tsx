import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import type { PartsRequest } from '@kinho/shared-types'
import { PARTS_REQUEST_STATUS_LABELS } from '@kinho/shared-types'
import { getPickById, confirmPickReceipt } from '../../services/warehouse'
import { getCurrentUser } from '../../utils/current-user'
import { apiPost } from '../../utils/api-client'
import { STATUS_BG } from '../../utils/status-styles'
import './index.scss'

const TIMELINE_STEPS = ['DRAFT', 'PENDING', 'APPROVED', 'SHIPPED', 'RECEIVED'] as const

export default function PickDetail() {
  const params = Taro.getCurrentInstance().router?.params || {}
  const id = Number(params.id)
  const [pick, setPick] = useState<PartsRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const user = getCurrentUser()
  const role = user.role || ''
  const isWarehouse = role === 'warehouse' || role === 'admin'
  const isEngineer = role === 'engineer' || role === 'admin'

  useEffect(() => {
    if (id) {
      getPickById(id).then((data) => {
        setPick(data)
        setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [id])

  const refresh = async () => {
    const data = await getPickById(id)
    setPick(data)
  }

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await apiPost(`/parts-requests/${id}/approve`)
      Taro.showToast({ title: '已审批', icon: 'success' })
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '审批失败', icon: 'none' })
    } finally { setActionLoading(false) }
  }

  const handleShip = async () => {
    setActionLoading(true)
    try {
      await apiPost(`/parts-requests/${id}/ship`)
      Taro.showToast({ title: '已发货', icon: 'success' })
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '发货失败', icon: 'none' })
    } finally { setActionLoading(false) }
  }

  const handleConfirmReceipt = async () => {
    if (!pick) return
    setActionLoading(true)
    try {
      await confirmPickReceipt(pick.id)
      Taro.showToast({ title: '已收货', icon: 'success' })
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '收货失败', icon: 'none' })
    } finally { setActionLoading(false) }
  }

  if (loading) return <View className='pk-detail'><Text className='pk-detail__status'>加载中...</Text></View>
  if (!pick) return <View className='pk-detail'><Text className='pk-detail__status'>未找到领料单</Text></View>

  const currentStepIndex = TIMELINE_STEPS.indexOf(pick.status as typeof TIMELINE_STEPS[number])

  return (
    <View className='pk-detail'>
      <PageHeader title='领料详情' />

      <View className='pk-detail__body'>
        <View className='pk-detail__card'>
          <View className='pk-detail__card-row'>
            <View>
              <Text className='pk-detail__card-no'>{pick.requestNo}</Text>
              <Text className='pk-detail__card-sub'>创建人: {pick.createdByName}</Text>
            </View>
            <View className={`pk-detail__badge ${STATUS_BG[pick.status] || ''}`}>
              <Text className='pk-detail__badge-text'>{PARTS_REQUEST_STATUS_LABELS[pick.status]}</Text>
            </View>
          </View>
          <View className='pk-detail__info-grid'>
            <View className='pk-detail__info-item'><Text className='pk-detail__info-label'>发起仓库：</Text><Text>{pick.fromWarehouseName}</Text></View>
            <View className='pk-detail__info-item'><Text className='pk-detail__info-label'>目标仓库：</Text><Text>{pick.toWarehouseName}</Text></View>
            <View className='pk-detail__info-item'><Text className='pk-detail__info-label'>关联工单：</Text><Text>{pick.workOrderNo || '—'}</Text></View>
            <View className='pk-detail__info-item'><Text className='pk-detail__info-label'>总数量：</Text><Text>{pick.totalQuantity}</Text></View>
          </View>
          {pick.remark && <Text className='pk-detail__remark'>备注: {pick.remark}</Text>}
        </View>

        <View className='pk-detail__card'>
          <Text className='pk-detail__card-title'>配件明细</Text>
          {pick.items.map((item) => (
            <View key={item.id} className='pk-detail__part-item'>
              <View>
                <Text className='pk-detail__part-name'>{item.partName}</Text>
                <Text className='pk-detail__part-model'>{item.partModel}</Text>
              </View>
              <View className='pk-detail__part-right'>
                <Text className='pk-detail__part-qty'>x{item.quantity}</Text>
                <Text className='pk-detail__part-reserved'>预留 {item.reservedQuantity}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className='pk-detail__card'>
          <Text className='pk-detail__card-title'>流程进度</Text>
          <View className='pk-detail__timeline'>
            <View className='pk-detail__timeline-line' />
            {TIMELINE_STEPS.map((step, i) => {
              const done = i <= currentStepIndex
              const current = i === currentStepIndex
              return (
                <View key={step} className='pk-detail__timeline-step'>
                  <View className={`pk-detail__timeline-dot ${current ? 'pk-detail__timeline-dot--current' : done ? 'pk-detail__timeline-dot--done' : ''}`} />
                  <Text className={`pk-detail__timeline-label ${current ? 'pk-detail__timeline-label--current' : ''}`}>
                    {PARTS_REQUEST_STATUS_LABELS[step]}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      </View>

      {(isWarehouse && pick.status === 'PENDING') && (
        <View className='pk-detail__footer'>
          <View className='pk-detail__confirm-btn' onClick={handleApprove}>
            <Text className='pk-detail__confirm-text'>{actionLoading ? '处理中...' : '审批通过'}</Text>
          </View>
        </View>
      )}
      {(isWarehouse && pick.status === 'APPROVED') && (
        <View className='pk-detail__footer'>
          <View className='pk-detail__confirm-btn' onClick={handleShip}>
            <Text className='pk-detail__confirm-text'>{actionLoading ? '处理中...' : '发货'}</Text>
          </View>
        </View>
      )}
      {(isEngineer && pick.status === 'SHIPPED') && (
        <View className='pk-detail__footer'>
          <View className='pk-detail__confirm-btn' onClick={handleConfirmReceipt}>
            <Text className='pk-detail__confirm-text'>{actionLoading ? '处理中...' : '确认收货'}</Text>
          </View>
        </View>
      )}
    </View>
  )
}

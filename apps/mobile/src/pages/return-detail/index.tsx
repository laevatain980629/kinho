import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import type { PartsReturn } from '@kinho/shared-types'
import { PARTS_RETURN_STATUS_LABELS, RETURN_REASON_LABELS } from '@kinho/shared-types'
import { getReturnById } from '../../services/warehouse'
import { getCurrentUser } from '../../utils/current-user'
import { apiPost } from '../../utils/api-client'
import { STATUS_BG } from '../../utils/status-styles'
import './index.scss'

const TIMELINE_STEPS = ['DRAFT', 'PENDING', 'CONFIRMED', 'RECEIVED'] as const

export default function ReturnDetail() {
  const params = Taro.getCurrentInstance().router?.params || {}
  const id = Number(params.id)
  const [ret, setRet] = useState<PartsReturn | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const user = getCurrentUser()
  const isWarehouse = user.role === 'warehouse' || user.role === 'admin'

  useEffect(() => {
    if (id) {
      getReturnById(id).then((data) => {
        setRet(data)
        setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [id])

  const handleConfirm = async () => {
    if (!ret) return
    setActionLoading(true)
    try {
      await apiPost(`/parts-returns/${id}/confirm`, {
        items: ret.items.map((i: any) => ({ partId: i.partId, qualityResult: 'GOOD' })),
      })
      Taro.showToast({ title: '已确认', icon: 'success' })
      const data = await getReturnById(id)
      setRet(data)
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '确认失败', icon: 'none' })
    } finally { setActionLoading(false) }
  }

  if (loading) return <View className='rt-detail'><Text className='rt-detail__status'>加载中...</Text></View>
  if (!ret) return <View className='rt-detail'><Text className='rt-detail__status'>未找到退库单</Text></View>

  const currentStepIndex = TIMELINE_STEPS.indexOf(ret.status as typeof TIMELINE_STEPS[number])

  return (
    <View className='rt-detail'>
      <PageHeader title='退库详情' />

      <View className='rt-detail__body'>
        <View className='rt-detail__card'>
          <View className='rt-detail__card-row'>
            <View>
              <Text className='rt-detail__card-no'>{ret.returnNo}</Text>
              <Text className='rt-detail__card-sub'>创建人: {ret.createdByName}</Text>
            </View>
            <View className={`rt-detail__badge ${STATUS_BG[ret.status] || ''}`}>
              <Text className='rt-detail__badge-text'>{PARTS_RETURN_STATUS_LABELS[ret.status]}</Text>
            </View>
          </View>
          <View className='rt-detail__info-grid'>
            <View className='rt-detail__info-item'><Text className='rt-detail__info-label'>发起仓库：</Text><Text>{ret.fromWarehouseName}</Text></View>
            <View className='rt-detail__info-item'><Text className='rt-detail__info-label'>目标仓库：</Text><Text>{ret.toWarehouseName}</Text></View>
            <View className='rt-detail__info-item'><Text className='rt-detail__info-label'>关联工单：</Text><Text>{ret.workOrderNo || '—'}</Text></View>
            <View className='rt-detail__info-item'><Text className='rt-detail__info-label'>退库原因：</Text><Text>{RETURN_REASON_LABELS[ret.reason]}</Text></View>
          </View>
          {ret.remark && <Text className='rt-detail__remark'>备注: {ret.remark}</Text>}
        </View>

        <View className='rt-detail__card'>
          <Text className='rt-detail__card-title'>退库明细</Text>
          {ret.items.map((item) => (
            <View key={item.id} className='rt-detail__part-item'>
              <View>
                <Text className='rt-detail__part-name'>{item.partName}</Text>
                <Text className='rt-detail__part-model'>{item.partModel}</Text>
              </View>
              <View className='rt-detail__part-right'>
                <Text className='rt-detail__part-qty'>x{item.quantity}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className='rt-detail__card'>
          <Text className='rt-detail__card-title'>流程进度</Text>
          <View className='rt-detail__timeline'>
            <View className='rt-detail__timeline-line' />
            {TIMELINE_STEPS.map((step, i) => {
              const done = i <= currentStepIndex
              const current = i === currentStepIndex
              return (
                <View key={step} className='rt-detail__timeline-step'>
                  <View className={`rt-detail__timeline-dot ${current ? 'rt-detail__timeline-dot--current' : done ? 'rt-detail__timeline-dot--done' : ''}`} />
                  <Text className={`rt-detail__timeline-label ${current ? 'rt-detail__timeline-label--current' : ''}`}>
                    {PARTS_RETURN_STATUS_LABELS[step]}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      </View>

      {(isWarehouse && ret.status === 'DRAFT') && (
        <View className='rt-detail__footer'>
          <View className='rt-detail__confirm-btn' onClick={handleConfirm}>
            <Text className='rt-detail__confirm-text'>{actionLoading ? '处理中...' : '确认退库'}</Text>
          </View>
        </View>
      )}
    </View>
  )
}

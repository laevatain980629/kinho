import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import type { ProcurementRequest } from '@kinho/shared-types'
import { PROCUREMENT_STATUS_LABELS } from '@kinho/shared-types'
import { getProcurementById, updateProcurementStatus } from '../../services/procurement'
import { STATUS_BG } from '../../utils/status-styles'
import './index.scss'

export default function ProcurementDetail() {
  const params = Taro.getCurrentInstance().router?.params || {}
  const id = Number(params.id)
  const [item, setItem] = useState<ProcurementRequest | null>(null)

  useEffect(() => {
    if (id) {
      getProcurementById(id).then(setItem)
    }
  }, [id])

  if (!item) {
    return (
      <View className='proc-detail'>
        <PageHeader title='采购详情' />
        <View className='proc-detail__loading'><Text>加载中...</Text></View>
      </View>
    )
  }

  const colorClass = STATUS_BG[item.status] || ''

  const handleApprove = async () => {
    await updateProcurementStatus(item.id)
    setItem({ ...item, status: 'APPROVED' })
  }

  const handleReject = async () => {
    await updateProcurementStatus(item.id)
    setItem({ ...item, status: 'REJECTED' })
  }

  return (
    <View className='proc-detail'>
      <PageHeader title='采购详情' />

      <View className='proc-detail__body'>
        <View className='proc-detail__card'>
          <View className='proc-detail__overview'>
            <View>
              <Text className='proc-detail__no'>{item.procurementNo}</Text>
              <Text className='proc-detail__sub'>{item.workOrderNo}</Text>
              <Text className='proc-detail__sub'>供应商：{item.supplierName}</Text>
              <Text className='proc-detail__sub'>创建人：{item.createdByName}</Text>
            </View>
            <View className='proc-detail__right'>
              <View className={`proc-detail__badge ${colorClass}`}>
                <Text className='proc-detail__badge-text'>{PROCUREMENT_STATUS_LABELS[item.status]}</Text>
              </View>
              <Text className='proc-detail__cost'>¥{item.estimatedCost.toLocaleString()}</Text>
            </View>
          </View>
          {item.remark && <Text className='proc-detail__remark'>备注：{item.remark}</Text>}
        </View>

        <View className='proc-detail__card'>
          <Text className='proc-detail__card-title'>采购明细</Text>
          {/* Table → flex layout */}
          <View className='proc-detail__table-header'>
            <Text className='proc-detail__col-name'>配件</Text>
            <Text className='proc-detail__col-qty'>数量</Text>
            <Text className='proc-detail__col-price'>单价</Text>
            <Text className='proc-detail__col-amount'>小计</Text>
          </View>
          {item.items.map((part) => (
            <View key={part.id} className='proc-detail__table-row'>
              <View className='proc-detail__col-name'>
                <Text className='proc-detail__part-name'>{part.partName}</Text>
                <Text className='proc-detail__part-model'>{part.partModel}</Text>
              </View>
              <Text className='proc-detail__col-qty'>{part.quantity}</Text>
              <Text className='proc-detail__col-price'>¥{part.unitPrice.toLocaleString()}</Text>
              <Text className='proc-detail__col-amount proc-detail__col-amount--bold'>¥{part.amount.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {item.supplierQuotes.length > 0 && (
          <View className='proc-detail__card'>
            <Text className='proc-detail__card-title'>供应商报价</Text>
            {item.supplierQuotes.map((sq) => (
              <View key={sq.id} className='proc-detail__quote-row'>
                <View>
                  <Text className='proc-detail__quote-name'>{sq.supplierName}</Text>
                  <Text className='proc-detail__quote-lead'>交期 {sq.leadTimeDays} 天</Text>
                </View>
                <Text className='proc-detail__quote-amount'>¥{sq.quotedAmount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {item.status === 'PENDING_APPROVAL' && (
        <View className='proc-detail__footer'>
          <View className='proc-detail__reject-btn' onClick={handleReject}>
            <Text className='proc-detail__reject-text'>驳回</Text>
          </View>
          <View className='proc-detail__approve-btn' onClick={handleApprove}>
            <Text className='proc-detail__approve-text'>批准</Text>
          </View>
        </View>
      )}
    </View>
  )
}

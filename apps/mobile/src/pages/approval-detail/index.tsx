import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import type { Quote, QuoteItem } from '@kinho/shared-types'
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@kinho/shared-types'
import { getApprovalById, approveQuote, rejectQuote } from '../../services/quote'
import './index.scss'

export default function ApprovalDetail() {
  const params = Taro.getCurrentInstance().router?.params || {}
  const id = Number(params.id)
  const [quote, setQuote] = useState<(Quote & { items: QuoteItem[] }) | null>(null)
  const [showReject, setShowReject] = useState(false)

  useEffect(() => {
    if (id) getApprovalById(id).then(setQuote)
  }, [id])

  if (!quote) return <View className='appr-detail'><PageHeader title='审批详情' /><View className='appr-detail__loading'><Text>加载中...</Text></View></View>

  const statusColor = QUOTE_STATUS_COLORS[quote.status] || 'default'
  const handleApprove = async () => { await approveQuote(quote.id); Taro.navigateBack() }
  const handleReject = async () => { await rejectQuote(quote.id); Taro.navigateBack() }

  return (
    <View className='appr-detail'>
      <PageHeader title='审批详情' />
      <View className='appr-detail__body'>
        <View className='appr-detail__card'>
          <View className='appr-detail__card-top'>
            <View>
              <Text className='appr-detail__no'>{quote.quoteNo}</Text>
              <Text className='appr-detail__sub'>{quote.workOrderNo} · {quote.createdBy}</Text>
            </View>
            <View className={`appr-detail__tag appr-detail__tag--${statusColor}`}>
              <Text className='appr-detail__tag-text'>{QUOTE_STATUS_LABELS[quote.status]}</Text>
            </View>
          </View>
        </View>

        <View className='appr-detail__card'>
          <Text className='appr-detail__title'>配件明细</Text>
          {(quote.items || []).map((item) => (
            <View key={item.id} className='appr-detail__part'>
              <View>
                <Text className='appr-detail__part-name'>{item.name}</Text>
                <Text className='appr-detail__part-price'>¥{item.unitPrice} × {item.quantity}</Text>
              </View>
              <Text className='appr-detail__part-amount'>¥{item.amount.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View className='appr-detail__card'>
          <View className='appr-detail__cost-row'>
            <Text className='appr-detail__cost-label'>工时费</Text>
            <Text>¥{(quote.laborCost || 0).toLocaleString()}</Text>
          </View>
          <View className='appr-detail__cost-row appr-detail__cost-row--total'>
            <Text>总金额</Text>
            <Text className='appr-detail__cost-total'>¥{(quote.totalAmount || 0).toLocaleString()}</Text>
          </View>
          {quote.remark && <Text className='appr-detail__remark'>备注：{quote.remark}</Text>}
        </View>
      </View>

      {(quote.status === 'PENDING_SUPERVISOR' || quote.status === 'PENDING_PROCUREMENT') && (
        <View className='appr-detail__footer'>
          <View className='appr-detail__reject-btn' onClick={() => setShowReject(true)}>
            <Text className='appr-detail__reject-text'>驳回</Text>
          </View>
          <View className='appr-detail__confirm-btn' onClick={handleApprove}>
            <Text className='appr-detail__confirm-text'>通过</Text>
          </View>
        </View>
      )}

      {showReject && (
        <View className='appr-detail__overlay' onClick={() => setShowReject(false)}>
          <View className='appr-detail__dialog' onClick={(e: any) => e.stopPropagation()}>
            <Text className='appr-detail__dialog-title'>确认驳回</Text>
            <Text className='appr-detail__dialog-desc'>驳回后报价将退回给工程师修改</Text>
            <View className='appr-detail__dialog-actions'>
              <View className='appr-detail__dialog-cancel' onClick={() => setShowReject(false)}>
                <Text>取消</Text>
              </View>
              <View className='appr-detail__dialog-confirm' onClick={handleReject}>
                <Text className='appr-detail__dialog-confirm-text'>确认驳回</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

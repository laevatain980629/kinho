import { useState, useEffect, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import LoadingView from '../../components/LoadingView'
import EmptyView from '../../components/EmptyView'
import type { ApprovalItem } from '@kinho/shared-types'
import { APPROVAL_TYPE_LABELS, APPROVAL_STATUS_LABELS } from '@kinho/shared-types'
import { getApprovals, approveApproval, rejectApproval } from '../../services/approval'
import { approveEscalation } from '../../services/work-order'
import { ensurePermission } from '../../utils/permissions'
import './index.scss'

const TYPE_TAG: Record<string, string> = {
  PARTS_REQUEST: 'bg-blue',
  PARTS_RETURN: 'bg-amber',
  QUOTE: 'bg-green',
  WORK_ORDER_ESCALATION: 'bg-red',
}

const STATUS_TAG: Record<string, string> = {
  PENDING: 'bg-amber',
  APPROVED: 'bg-green',
  REJECTED: 'bg-red',
}

export default function ApprovalList() {
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending')
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchItems = useCallback(() => {
    setLoading(true)
    getApprovals({ tab })
      .then((res) => {
        setItems(res.list)
        setError('')
      })
      .catch((err: any) => {
        const message = err?.message || '加载审批失败'
        setItems([])
        setError(message)
        Taro.showToast({ title: message, icon: 'none' })
      })
      .finally(() => setLoading(false))
  }, [tab])

  useEffect(() => {
    ensurePermission('menu:approval').then((allowed) => {
      if (allowed) fetchItems()
    })
  }, [fetchItems])

  const handleApprove = async (item: ApprovalItem) => {
    try {
      if (item.type === 'WORK_ORDER_ESCALATION') {
        await approveEscalation(item.sourceId)
      }
      await approveApproval(item.id)
      fetchItems()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '审批失败', icon: 'none' })
    }
  }

  const handleRejectConfirm = async (id: number) => {
    if (!rejectReason.trim()) return
    try {
      await rejectApproval(id, rejectReason.trim())
      setRejectingId(null)
      setRejectReason('')
      fetchItems()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '驳回失败', icon: 'none' })
    }
  }

  return (
    <View className='appr-list'>
      <View className='appr-list__header'>
        <Text className='appr-list__title'>审批中心</Text>
        <View className='appr-list__tabs'>
          <View className={`appr-list__tab ${tab === 'pending' ? 'appr-list__tab--active' : ''}`} onClick={() => setTab('pending')}>
            <Text className='appr-list__tab-text'>待我审批</Text>
          </View>
          <View className={`appr-list__tab ${tab === 'resolved' ? 'appr-list__tab--active' : ''}`} onClick={() => setTab('resolved')}>
            <Text className='appr-list__tab-text'>我已审批</Text>
          </View>
        </View>
      </View>

      <View className='appr-list__body'>
        {loading ? <LoadingView /> : items.length === 0 ? (
          <EmptyView text={error || (tab === 'pending' ? '暂无待审批项' : '暂无已审批项')} />
        ) : items.map((item) => (
          <View key={item.id} className='appr-list__card'>
            <View className='appr-list__card-top'>
              <View className='appr-list__card-left'>
                <View className='appr-list__card-header'>
                  <View className={`appr-list__type-tag ${TYPE_TAG[item.type] || 'bg-gray'}`}>
                    <Text className='appr-list__type-tag-text'>{APPROVAL_TYPE_LABELS[item.type] || item.type}</Text>
                  </View>
                  <Text className='appr-list__card-no'>{item.sourceNo}</Text>
                </View>
                <Text className='appr-list__card-summary'>{item.summary}</Text>
                <Text className='appr-list__card-meta'>申请人：{item.applicantName} · {item.createdAt.slice(0, 10)}</Text>
              </View>
              <View className={`appr-list__status-tag ${STATUS_TAG[item.status] || 'bg-gray'}`}>
                <Text className='appr-list__status-tag-text'>{APPROVAL_STATUS_LABELS[item.status] || item.status}</Text>
              </View>
            </View>

            {item.status === 'PENDING' && (
              <View className='appr-list__card-actions'>
                <View className='appr-list__approve-btn' onClick={() => handleApprove(item)}>
                  <Text className='appr-list__approve-text'>通过</Text>
                </View>
                <View className='appr-list__card-reject-btn' onClick={() => { setRejectingId(rejectingId === item.id ? null : item.id); setRejectReason('') }}>
                  <Text className='appr-list__card-reject-text'>驳回</Text>
                </View>
              </View>
            )}

            {rejectingId === item.id && (
              <View className='appr-list__reject-form'>
                <textarea className='appr-list__textarea' value={rejectReason} placeholder='请输入驳回原因' onInput={(e: any) => setRejectReason(e.detail.value)} />
                <View className={`appr-list__reject-submit ${!rejectReason.trim() ? 'appr-list__reject-submit--disabled' : ''}`} onClick={() => handleRejectConfirm(item.id)}>
                  <Text className='appr-list__reject-submit-text'>确认驳回</Text>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

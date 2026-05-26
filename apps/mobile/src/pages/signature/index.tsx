import { useEffect, useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import LoadingView from '../../components/LoadingView'
import { WORK_ORDER_STATE_LABELS } from '@kinho/shared-types'
import { customerSignReceipt, getWorkOrderById, getReceiptsByWorkOrder } from '../../services/work-order'
import './index.scss'

export default function Signature() {
  const params = Taro.getCurrentInstance().router?.params || {}
  const id = Number(params.id)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [signatureUrl, setSignatureUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [workOrder, setWorkOrder] = useState<any>(null)
  const [receiptId, setReceiptId] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setError('工单参数缺失')
      setLoading(false)
      return
    }

    Promise.all([getWorkOrderById(id), getReceiptsByWorkOrder(id)])
      .then(([order, receipts]) => {
        setWorkOrder(order)
        // 找到最新的 PENDING_SIGNATURE 回执
        const pendingReceipt = (receipts || []).find((r: any) => r.status === 'PENDING_SIGNATURE')
        if (pendingReceipt) {
          setReceiptId(pendingReceipt.id)
        } else {
          setError('未找到待签字的维修回执')
        }
        setError((prev) => prev || '')
      })
      .catch((err: any) => {
        setError(err?.message || '加载失败')
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async () => {
    if (!customerName.trim() || !signatureUrl || submitting || !receiptId) return
    setSubmitting(true)
    try {
      await customerSignReceipt(receiptId, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        signatureUrl,
        signedOnDevice: 'mobile',
      })
      Taro.showToast({ title: '签字完成', icon: 'success' })
      Taro.navigateBack()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '签字失败', icon: 'none' })
      setSubmitting(false)
    }
  }

  const canSubmit = customerName.trim() && signatureUrl && receiptId && !submitting

  if (loading) {
    return (
      <View className='signature'>
        <PageHeader title='客户签名' />
        <LoadingView />
      </View>
    )
  }

  return (
    <View className='signature'>
      <PageHeader title='客户签名' />
      <View className='signature__body'>
        <View className='signature__card'>
          <Text className='signature__card-title'>维修回执摘要</Text>
          {error ? (
            <Text className='signature__info'>{error}</Text>
          ) : (
            <>
              <Text className='signature__info'>工单：{workOrder?.orderNo || '-'}</Text>
              <Text className='signature__info'>维修项目：{workOrder?.title || workOrder?.faultDesc || '-'}</Text>
              <Text className='signature__info'>机台：{workOrder?.machineSerialSnapshot || workOrder?.machineModelSnapshot || '-'}</Text>
              <Text className='signature__info'>状态：{WORK_ORDER_STATE_LABELS[workOrder?.state] || workOrder?.state || '-'}</Text>
            </>
          )}
        </View>

        <View className='signature__card'>
          <Text className='signature__card-title'>客户信息</Text>
          <View className='signature__form'>
            <Input
              className='signature__input'
              placeholder='客户姓名 *'
              value={customerName}
              onInput={(e: any) => setCustomerName(e.detail.value)}
            />
            <Input
              className='signature__input'
              placeholder='客户电话（可选）'
              value={customerPhone}
              onInput={(e: any) => setCustomerPhone(e.detail.value)}
            />
          </View>
        </View>

        <View className='signature__card'>
          <Text className='signature__card-title'>签名图片URL</Text>
          <Input
            className='signature__input'
            placeholder='请输入签名图片URL *'
            value={signatureUrl}
            onInput={(e: any) => setSignatureUrl(e.detail.value)}
          />
        </View>

        <View className={`signature__submit ${!canSubmit ? 'signature__submit--disabled' : ''}`} onClick={handleSubmit}>
          <Text className='signature__submit-text'>{submitting ? '提交中...' : '确认提交'}</Text>
        </View>
      </View>
    </View>
  )
}

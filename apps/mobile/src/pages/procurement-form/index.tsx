import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import { createProcurement } from '../../services/procurement'
import { getCurrentUser } from '../../utils/current-user'
import './index.scss'

interface PartLine {
  partId?: number
  partName: string
  partModel: string
  quantity: number
  unitPrice: number
  amount: number
}

const createPartLine = (): PartLine => ({
  partName: '',
  partModel: '',
  quantity: 1,
  unitPrice: 0,
  amount: 0,
})

export default function ProcurementForm() {
  const [supplierName, setSupplierName] = useState('')
  const [workOrderNo, setWorkOrderNo] = useState('')
  const [quoteNo, setQuoteNo] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [parts, setParts] = useState<PartLine[]>([createPartLine()])

  const updatePart = (i: number, field: keyof PartLine, value: string | number) => {
    setParts((prev) => {
      const updated = [...prev]
      const part = { ...updated[i], [field]: value }
      const qty = field === 'quantity' ? Number(value) : part.quantity
      const price = field === 'unitPrice' ? Number(value) : part.unitPrice
      part.amount = qty * price
      updated[i] = part
      return updated
    })
  }

  const addPart = () => setParts((prev) => [...prev, createPartLine()])
  const removePart = (i: number) => {
    if (parts.length <= 1) return
    setParts((prev) => prev.filter((_, j) => j !== i))
  }

  const validParts = parts.filter((p) => p.partName.trim() && p.quantity > 0)
  const totalAmount = validParts.reduce((sum, p) => sum + p.amount, 0)

  const handleSubmit = async () => {
    if (submitting) return
    if (!supplierName.trim()) {
      Taro.showToast({ title: '请输入供应商名称', icon: 'none' })
      return
    }
    if (validParts.length === 0) {
      Taro.showToast({ title: '请至少填写一条配件明细', icon: 'none' })
      return
    }

    const user = getCurrentUser()
    if (!user.id || !(user.name || user.username)) {
      Taro.showToast({ title: '登录状态失效，请重新登录', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      await createProcurement({
        workOrderNo: workOrderNo || undefined,
        quoteNo: quoteNo || undefined,
        supplierId: 1,
        supplierName,
        items: validParts.map((p, i) => ({ ...p, partId: p.partId, id: i + 1 })),
        supplierQuotes: [],
        estimatedCost: totalAmount,
        remark: remark || undefined,
        createdById: user.id,
        createdByName: user.name || user.username || '',
      })
      Taro.navigateBack()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='proc-form'>
      <PageHeader title='新建采购' />
      <View className='proc-form__body'>
        <View className='proc-form__card'>
          <View className='proc-form__field'>
            <Text className='proc-form__label'>供应商名称 *</Text>
            <Input className='proc-form__input' value={supplierName} placeholder='请输入供应商名称' onInput={(e) => setSupplierName(e.detail.value)} />
          </View>
          <View className='proc-form__field'>
            <Text className='proc-form__label'>工单号</Text>
            <Input className='proc-form__input' value={workOrderNo} placeholder='选填' onInput={(e) => setWorkOrderNo(e.detail.value)} />
          </View>
          <View className='proc-form__field'>
            <Text className='proc-form__label'>报价单号</Text>
            <Input className='proc-form__input' value={quoteNo} placeholder='选填' onInput={(e) => setQuoteNo(e.detail.value)} />
          </View>
        </View>

        <View className='proc-form__card'>
          <View className='proc-form__card-header'>
            <Text className='proc-form__card-title'>配件明细</Text>
            <View className='proc-form__add-btn' onClick={addPart}><Text className='proc-form__add-text'>+ 添加</Text></View>
          </View>
          {parts.map((part, i) => (
            <View key={i} className='proc-form__part-card'>
              <View className='proc-form__part-top'>
                <Text className='proc-form__part-num'>配件 {i + 1}</Text>
                {parts.length > 1 && (
                  <View className='proc-form__remove' onClick={() => removePart(i)}><Text className='proc-form__remove-text'>x</Text></View>
                )}
              </View>
              <Input className='proc-form__input proc-form__input--sm' value={part.partName} placeholder='配件名称' onInput={(e) => updatePart(i, 'partName', e.detail.value)} />
              <Input className='proc-form__input proc-form__input--sm' value={part.partModel} placeholder='型号' onInput={(e) => updatePart(i, 'partModel', e.detail.value)} />
              <View className='proc-form__part-row'>
                <Input className='proc-form__part-qty' type='number' value={String(part.quantity || '')} placeholder='数量' onInput={(e) => updatePart(i, 'quantity', Number(e.detail.value))} />
                <Input className='proc-form__part-qty' type='number' value={String(part.unitPrice || '')} placeholder='单价' onInput={(e) => updatePart(i, 'unitPrice', Number(e.detail.value))} />
              </View>
              <Text className='proc-form__part-sub'>小计：￥{part.amount.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View className='proc-form__card'>
          <Text className='proc-form__label'>备注</Text>
          <textarea className='proc-form__textarea' value={remark} placeholder='选填' onInput={(e: any) => setRemark(e.detail.value)} />
        </View>

        <Text className='proc-form__total'>合计：￥{totalAmount.toLocaleString()}</Text>
      </View>

      <View className='proc-form__footer'>
        <View className={`proc-form__submit ${submitting || !supplierName.trim() ? 'proc-form__submit--disabled' : ''}`} onClick={handleSubmit}>
          <Text className='proc-form__submit-text'>{submitting ? '提交中...' : '提交采购'}</Text>
        </View>
      </View>
    </View>
  )
}

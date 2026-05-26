import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import { RETURN_REASON_LABELS } from '@kinho/shared-types'
import type { ReturnReason } from '@kinho/shared-types'
import { createReturn } from '../../services/warehouse'
import './index.scss'

const REASON_OPTIONS = Object.entries(RETURN_REASON_LABELS).map(([k, v]) => ({ key: k, label: v }))

interface PartRow { partId?: number; partName: string; quantity: number }

const createPartRow = (): PartRow => ({ partName: '', quantity: 1 })

export default function ReturnForm() {
  const [workOrderNo, setWorkOrderNo] = useState('')
  const [reason, setReason] = useState<ReturnReason>('WRONG_PART')
  const [parts, setParts] = useState<PartRow[]>([createPartRow()])
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addPart = () => setParts([...parts, createPartRow()])
  const removePart = (i: number) => {
    if (parts.length <= 1) return
    setParts(parts.filter((_, j) => j !== i))
  }
  const updatePart = (i: number, f: keyof PartRow, v: string | number) => setParts(parts.map((p, j) => j === i ? { ...p, [f]: v } : p))
  const validParts = parts.filter((p) => p.partName.trim() && p.quantity > 0)
  const isValid = validParts.length > 0

  const handleSubmit = async () => {
    if (submitting) return
    if (!isValid) {
      Taro.showToast({ title: '请至少填写一条配件明细', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      await createReturn({
        workOrderNo: workOrderNo || undefined,
        reason,
        items: validParts.map((p) => ({ partId: p.partId, partName: p.partName, quantity: p.quantity })),
        remark: remark || undefined,
      })
      Taro.navigateBack()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='ret-form'>
      <PageHeader title='新建退库单' />
      <View className='ret-form__body'>
        <View className='ret-form__card'>
          <View className='ret-form__field'>
            <Text className='ret-form__label'>关联工单号</Text>
            <Input className='ret-form__input' value={workOrderNo} placeholder='输入工单号' onInput={(e) => setWorkOrderNo(e.detail.value)} />
          </View>
          <View className='ret-form__field'>
            <Text className='ret-form__label'>退库原因</Text>
            <View className='ret-form__chips'>
              {REASON_OPTIONS.map((o) => (
                <View key={o.key} className={`ret-form__chip ${reason === o.key ? 'ret-form__chip--active' : ''}`} onClick={() => setReason(o.key as ReturnReason)}>
                  <Text className='ret-form__chip-text'>{o.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className='ret-form__card'>
          <View className='ret-form__card-header'>
            <Text className='ret-form__card-title'>退库配件</Text>
            <View className='ret-form__add-btn' onClick={addPart}><Text className='ret-form__add-text'>+ 添加</Text></View>
          </View>
          {parts.map((part, i) => (
            <View key={i} className='ret-form__part-row'>
              <Input className='ret-form__part-input' value={part.partName} placeholder='配件名称' onInput={(e) => updatePart(i, 'partName', e.detail.value)} />
              <Input className='ret-form__part-qty' type='number' value={String(part.quantity)} placeholder='数量' onInput={(e) => updatePart(i, 'quantity', Number(e.detail.value))} />
              {parts.length > 1 && (
                <View className='ret-form__remove' onClick={() => removePart(i)}><Text className='ret-form__remove-text'>x</Text></View>
              )}
            </View>
          ))}
        </View>

        <View className='ret-form__card'>
          <Text className='ret-form__label'>备注</Text>
          <textarea className='ret-form__textarea' value={remark} placeholder='选填备注信息' onInput={(e: any) => setRemark(e.detail.value)} />
        </View>
      </View>

      <View className='ret-form__footer'>
        <View className={`ret-form__submit ${submitting || !isValid ? 'ret-form__submit--disabled' : ''}`} onClick={handleSubmit}>
          <Text className='ret-form__submit-text'>{submitting ? '提交中...' : '提交退库单'}</Text>
        </View>
      </View>
    </View>
  )
}

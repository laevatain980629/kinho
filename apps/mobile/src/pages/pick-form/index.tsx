import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import { PARTS_REQUEST_TYPE_LABELS } from '@kinho/shared-types'
import type { PartsRequestType } from '@kinho/shared-types'
import { createPick } from '../../services/warehouse'
import './index.scss'

const TYPE_OPTIONS = Object.entries(PARTS_REQUEST_TYPE_LABELS).map(([k, v]) => ({ key: k, label: v }))

interface PartRow { partId?: number; partName: string; quantity: number }

const createPartRow = (): PartRow => ({ partName: '', quantity: 1 })

export default function PickForm() {
  const [type, setType] = useState<PartsRequestType>('WORK_ORDER_PICK')
  const [workOrderNo, setWorkOrderNo] = useState('')
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
      await createPick({
        type,
        workOrderNo: workOrderNo || undefined,
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
    <View className='pick-form'>
      <PageHeader title='新建领料单' />
      <View className='pick-form__body'>
        <View className='pick-form__card'>
          <View className='pick-form__field'>
            <Text className='pick-form__label'>领料类型</Text>
            <View className='pick-form__chips'>
              {TYPE_OPTIONS.map((o) => (
                <View key={o.key} className={`pick-form__chip ${type === o.key ? 'pick-form__chip--active' : ''}`} onClick={() => setType(o.key as PartsRequestType)}>
                  <Text className='pick-form__chip-text'>{o.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View className='pick-form__field'>
            <Text className='pick-form__label'>关联工单号</Text>
            <Input className='pick-form__input' value={workOrderNo} placeholder='输入工单号' onInput={(e) => setWorkOrderNo(e.detail.value)} />
          </View>
        </View>

        <View className='pick-form__card'>
          <View className='pick-form__card-header'>
            <Text className='pick-form__card-title'>配件明细</Text>
            <View className='pick-form__add-btn' onClick={addPart}><Text className='pick-form__add-text'>+ 添加</Text></View>
          </View>
          {parts.map((part, i) => (
            <View key={i} className='pick-form__part-row'>
              <Input className='pick-form__part-input' value={part.partName} placeholder='配件名称' onInput={(e) => updatePart(i, 'partName', e.detail.value)} />
              <Input className='pick-form__part-qty' type='number' value={String(part.quantity)} placeholder='数量' onInput={(e) => updatePart(i, 'quantity', Number(e.detail.value))} />
              {parts.length > 1 && (
                <View className='pick-form__remove' onClick={() => removePart(i)}><Text className='pick-form__remove-text'>x</Text></View>
              )}
            </View>
          ))}
        </View>

        <View className='pick-form__card'>
          <Text className='pick-form__label'>备注</Text>
          <textarea className='pick-form__textarea' value={remark} placeholder='选填备注信息' onInput={(e: any) => setRemark(e.detail.value)} />
        </View>
      </View>

      <View className='pick-form__footer'>
        <View className={`pick-form__submit ${submitting || !isValid ? 'pick-form__submit--disabled' : ''}`} onClick={handleSubmit}>
          <Text className='pick-form__submit-text'>{submitting ? '提交中...' : '提交领料单'}</Text>
        </View>
      </View>
    </View>
  )
}

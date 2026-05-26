import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import PhotoUpload, { TaroAttachment } from '../../components/PhotoUpload'
import { useReceiptForm, CHARGE_TYPE_OPTIONS } from '@kinho/shared-hooks'
import { createReceipt } from '../../services/work-order'
import { getCurrentUser } from '../../utils/current-user'
import { SUBMIT_RECEIPT, validateActionForm } from '@kinho/workflow'
import './index.scss'

export default function Receipt() {
  const params = Taro.getCurrentInstance().router?.params || {}
  const workOrderId = Number(params.id) || 0
  const {
    summary, setSummary,
    warrantyNote, setWarrantyNote,
    repairItems, addRepair, removeRepair, updateRepair,
    partItems, addPart, removePart, updatePart,
    chargeItems, addCharge, removeCharge, updateCharge,
    totalAmount, isValid, buildPayload,
  } = useReceiptForm(workOrderId)
  const [afterRepairPhotos, setAfterRepairPhotos] = useState<TaroAttachment[]>([])

  const handleSubmit = async () => {
    if (!isValid) return
    const payload = buildPayload()
    const form = {
      repairSummary: payload.summary,
      repairItems: payload.repairItems || [],
      partsUsed: payload.partsUsed || [],
      charges: payload.charges || [],
    }
    const v = validateActionForm(SUBMIT_RECEIPT, form)
    if (!v.valid) { Taro.showToast({ title: Object.values(v.errors).join('；'), icon: 'none' }); return }
    const user = getCurrentUser()
    try {
      await createReceipt(workOrderId, form, user?.id ?? 0)
      Taro.showToast({ title: '回执已提交', icon: 'success' })
      Taro.navigateBack()
    } catch {
      Taro.showToast({ title: '提交失败', icon: 'none' })
    }
  }

  return (
    <View className='receipt'>
      <PageHeader title='提交维修回执' />
      <View className='receipt__body'>
        {/* Summary */}
        <View className='receipt__card'>
          <Text className='receipt__label'>维修总结 <Text className='receipt__required'>*</Text></Text>
          <textarea className='receipt__textarea' value={summary} placeholder='请描述维修情况...' onInput={(e: any) => setSummary(e.detail.value)} />
        </View>

        {/* Repair Items */}
        <View className='receipt__card'>
          <View className='receipt__card-header'>
            <Text className='receipt__card-title'>维修项目</Text>
            <View className='receipt__add-btn' onClick={addRepair}><Text className='receipt__add-text'>+ 添加</Text></View>
          </View>
          {repairItems.map((item) => (
            <View key={item.id} className='receipt__item-card'>
              <View className='receipt__item-row'>
                <Input className='receipt__input' value={item.name} placeholder='维修内容' onInput={(e) => updateRepair(item.id, 'name', e.detail.value)} />
                <View className='receipt__remove' onClick={() => removeRepair(item.id)}><Text className='receipt__remove-text'>×</Text></View>
              </View>
              <View className='receipt__item-row'>
                <Input className='receipt__input receipt__input--sm' value={item.description} placeholder='维修描述' onInput={(e) => updateRepair(item.id, 'description', e.detail.value)} />
                <Input className='receipt__qty-input' type='number' value={String(item.laborHours || '')} placeholder='工时(h)' onInput={(e) => updateRepair(item.id, 'laborHours', Number(e.detail.value))} />
              </View>
            </View>
          ))}
        </View>

        {/* Parts */}
        <View className='receipt__card'>
          <View className='receipt__card-header'>
            <Text className='receipt__card-title'>使用配件</Text>
            <View className='receipt__add-btn' onClick={addPart}><Text className='receipt__add-text'>+ 添加</Text></View>
          </View>
          {partItems.map((item) => (
            <View key={item.id} className='receipt__part-row'>
              <Input className='receipt__input' value={item.partName} placeholder='配件名称' onInput={(e) => updatePart(item.id, 'partName', e.detail.value)} />
              <Input className='receipt__input' value={item.partModel || ''} placeholder='型号(选填)' onInput={(e) => updatePart(item.id, 'partModel', e.detail.value)} />
              <Input className='receipt__qty-input' type='number' value={String(item.quantity || '')} placeholder='数量' onInput={(e) => updatePart(item.id, 'quantity', Number(e.detail.value))} />
              <View className='receipt__remove' onClick={() => removePart(item.id)}><Text className='receipt__remove-text'>×</Text></View>
            </View>
          ))}
        </View>

        {/* Charges */}
        <View className='receipt__card'>
          <View className='receipt__card-header'>
            <Text className='receipt__card-title'>收费项目</Text>
            <View className='receipt__add-btn' onClick={addCharge}><Text className='receipt__add-text'>+ 添加</Text></View>
          </View>
          {chargeItems.map((item) => (
            <View key={item.id} className='receipt__item-card'>
              <View className='receipt__item-row'>
                <View className='receipt__chips'>
                  {CHARGE_TYPE_OPTIONS.map((t) => (
                    <View key={t.value} className={`receipt__chip ${item.chargeType === t.value ? 'receipt__chip--active' : ''}`} onClick={() => updateCharge(item.id, 'chargeType', t.value)}>
                      <Text className='receipt__chip-text'>{t.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className='receipt__item-row'>
                <Input className='receipt__input' value={item.name} placeholder='名称' onInput={(e) => updateCharge(item.id, 'name', e.detail.value)} />
                <View className='receipt__remove' onClick={() => removeCharge(item.id)}><Text className='receipt__remove-text'>×</Text></View>
              </View>
              <View className='receipt__item-row'>
                <Input className='receipt__qty-input' type='number' value={String(item.quantity || '')} placeholder='数量' onInput={(e) => updateCharge(item.id, 'quantity', Number(e.detail.value))} />
                <Input className='receipt__qty-input' type='number' value={String(item.unitPrice || '')} placeholder='单价' onInput={(e) => updateCharge(item.id, 'unitPrice', Number(e.detail.value))} />
                <View className='receipt__amount'><Text className='receipt__amount-text'>¥{item.amount.toFixed(2)}</Text></View>
              </View>
            </View>
          ))}
          <View className='receipt__total'>
            <Text className='receipt__total-label'>合计金额</Text>
            <Text className='receipt__total-value'>¥{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Photos */}
        <View className='receipt__card'>
          <Text className='receipt__label'>📷 维修后照片</Text>
          <PhotoUpload value={afterRepairPhotos} onChange={setAfterRepairPhotos} max={9} />
        </View>

        {/* Warranty */}
        <View className='receipt__card'>
          <Text className='receipt__label'>保修说明 <Text className='receipt__optional'>(可选)</Text></Text>
          <textarea className='receipt__textarea' value={warrantyNote} placeholder='保修期限、保修范围等...' onInput={(e: any) => setWarrantyNote(e.detail.value)} />
        </View>

        {/* Submit */}
        <View className={`receipt__submit ${!isValid ? 'receipt__submit--disabled' : ''}`} onClick={handleSubmit}>
          <Text className='receipt__submit-text'>提交回执</Text>
        </View>
      </View>
    </View>
  )
}

import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import PhotoUpload, { TaroAttachment } from '../../components/PhotoUpload'
import { useFaultConfirmForm, useFaultTypes } from '@kinho/shared-hooks'
import { confirmFault } from '../../services/work-order'
import { CONFIRM_FAULT, validateActionForm } from '@kinho/workflow'
import './index.scss'

export default function FaultConfirm() {
  const params = Taro.getCurrentInstance().router?.params || {}
  const workOrderId = Number(params.id) || 0
  const {
    selected, toggle,
    description, setDescription,
    faultCause, setFaultCause,
    suggestedPlan, setSuggestedPlan,
    needQuote, setNeedQuote,
    needParts, setNeedParts,
    needProcurement, setNeedProcurement,
    submitting, errors, isValid, buildPayload,
  } = useFaultConfirmForm(workOrderId)
  const faultTypes = useFaultTypes()
  const [faultPhotos, setFaultPhotos] = useState<TaroAttachment[]>([])

  const handleSubmit = async () => {
    if (!isValid) return
    const payload = buildPayload()
    const form = {
      faultTypeIds: payload.faultTypeIds,
      faultDesc: payload.description,
      faultCause: faultCause.trim() || undefined,
      faultPhotos: faultPhotos.map(p => p.url),
      suggestedRepairPlan: suggestedPlan.trim() || undefined,
      needQuote, needParts, needProcurement,
    }
    const v = validateActionForm(CONFIRM_FAULT, form)
    if (!v.valid) { Taro.showToast({ title: Object.values(v.errors).join('；'), icon: 'none' }); return }
    try {
      await confirmFault(workOrderId, form)
      Taro.showToast({ title: '故障已确认', icon: 'success' })
      Taro.navigateBack()
    } catch {
      Taro.showToast({ title: '提交失败', icon: 'none' })
    }
  }

  return (
    <View className='fault-confirm'>
      <PageHeader title='确认故障' />
      <View className='fault-confirm__body'>
        {/* Fault Types */}
        <View className='fault-confirm__card'>
          <Text className='fault-confirm__label'>故障分类（可多选）</Text>
          {errors.types && <Text className='fault-confirm__error'>{errors.types}</Text>}
          <View className='fault-confirm__chips'>
            {faultTypes.map((type) => (
              <View key={type} className={`fault-confirm__chip ${selected.includes(type) ? 'fault-confirm__chip--active' : ''}`} onClick={() => toggle(type)}>
                <Text className='fault-confirm__chip-text'>{type}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Description */}
        <View className='fault-confirm__card'>
          <Text className='fault-confirm__label'>故障描述 <Text className='fault-confirm__required'>*</Text></Text>
          <textarea className='fault-confirm__textarea' value={description} placeholder='请详细描述故障现象' onInput={(e: any) => setDescription(e.detail.value)} />
          {errors.description && <Text className='fault-confirm__error'>{errors.description}</Text>}
        </View>

        {/* Fault Cause */}
        <View className='fault-confirm__card'>
          <Text className='fault-confirm__label'>故障原因 <Text className='fault-confirm__optional'>(可选)</Text></Text>
          <textarea className='fault-confirm__textarea' value={faultCause} placeholder='分析故障原因...' onInput={(e: any) => setFaultCause(e.detail.value)} />
        </View>

        {/* Photos */}
        <View className='fault-confirm__card'>
          <Text className='fault-confirm__label'>故障照片</Text>
          <PhotoUpload value={faultPhotos} onChange={setFaultPhotos} max={9} />
        </View>

        {/* Suggested Plan */}
        <View className='fault-confirm__card'>
          <Text className='fault-confirm__label'>建议维修方案 <Text className='fault-confirm__optional'>(可选)</Text></Text>
          <textarea className='fault-confirm__textarea' value={suggestedPlan} placeholder='建议的维修方案...' onInput={(e: any) => setSuggestedPlan(e.detail.value)} />
        </View>

        {/* Follow-up needs */}
        <View className='fault-confirm__card'>
          <Text className='fault-confirm__label'>后续需求</Text>
          <View className='fault-confirm__checks'>
            <View className='fault-confirm__check' onClick={() => setNeedQuote(!needQuote)}>
              <Text className='fault-confirm__check-box'>{needQuote ? '☑' : '☐'}</Text>
              <Text className='fault-confirm__check-label'>需要报价</Text>
            </View>
            <View className='fault-confirm__check' onClick={() => setNeedParts(!needParts)}>
              <Text className='fault-confirm__check-box'>{needParts ? '☑' : '☐'}</Text>
              <Text className='fault-confirm__check-label'>需要配件</Text>
            </View>
            <View className='fault-confirm__check' onClick={() => setNeedProcurement(!needProcurement)}>
              <Text className='fault-confirm__check-box'>{needProcurement ? '☑' : '☐'}</Text>
              <Text className='fault-confirm__check-label'>需要采购</Text>
            </View>
          </View>
        </View>

        <View className={`fault-confirm__submit ${submitting || !isValid ? 'fault-confirm__submit--disabled' : ''}`} onClick={handleSubmit}>
          <Text className='fault-confirm__submit-text'>{submitting ? '提交中...' : '确认故障'}</Text>
        </View>
      </View>
    </View>
  )
}

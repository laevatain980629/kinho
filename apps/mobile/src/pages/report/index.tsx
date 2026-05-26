import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { submitRepairRequest } from '../../services/customer'
import './index.scss'

export default function Report() {
  const [phone, setPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [machineSerial, setMachineSerial] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ id: number; orderNo: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!/^1[3-9]\d{9}$/.test(phone)) errs.phone = '请输入正确的手机号'
    if (!customerName.trim()) errs.customerName = '请输入姓名'
    if (!machineSerial.trim()) errs.machineSerial = '请输入设备编号'
    if (description.length < 10) errs.description = '故障描述至少 10 个字'
    if (!address.trim()) errs.address = '请输入服务地址'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const result = await submitRepairRequest({
        customerName, phone, machineSerial, faultDesc: description, address,
      })
      setSuccess({ id: result.id, orderNo: result.orderNo })
    } catch {
      Taro.showToast({ title: '提交失败，请稍后再试', icon: 'none' })
    } finally { setLoading(false) }
  }

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
    }
  }

  const resetForm = () => {
    setSuccess(null); setPhone(''); setMachineSerial(''); setDescription(''); setAddress(''); setErrors({})
  }

  if (success) {
    return (
      <View className='report'>
        <View className='report__success'>
          <View className='report__success-icon'>✓</View>
          <Text className='report__success-title'>报修成功</Text>
          <View className='report__success-card'>
            <Text className='report__success-label'>工单编号</Text>
            <Text className='report__success-no'>{success.orderNo}</Text>
          </View>
          <Text className='report__success-desc'>工作人员会尽快联系您</Text>
          <View className='report__success-actions'>
            <View className='report__reset-btn' onClick={resetForm}>
              <Text className='report__reset-text'>继续报修</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='report'>
      <View className='report__header'>
        <View className='report__logo'>MG</View>
        <Text className='report__title'>在线报修</Text>
        <Text className='report__subtitle'>填写以下信息，我们将尽快为您安排维修</Text>
      </View>

      <View className='report__form'>
        {/* Name */}
        <View className='report__card'>
          <Text className='report__label'>姓名 *</Text>
          <Input
            className='report__input'
            placeholder='请输入您的姓名'
            value={customerName}
            onInput={(e) => { setCustomerName(e.detail.value); clearError('customerName') }}
          />
          {errors.customerName && <Text className='report__error'>{errors.customerName}</Text>}
        </View>

        {/* Phone */}
        <View className='report__card'>
          <Text className='report__label'>联系电话 *</Text>
          <Input
            className='report__input'
            type='number'
            placeholder='请输入手机号'
            value={phone}
            onInput={(e) => { setPhone(e.detail.value); clearError('phone') }}
            maxlength={11}
          />
          {errors.phone && <Text className='report__error'>{errors.phone}</Text>}
        </View>

        {/* Machine Serial */}
        <View className='report__card'>
          <Text className='report__label'>设备编号 *</Text>
          <Input
            className='report__input'
            placeholder='请输入设备编号'
            value={machineSerial}
            onInput={(e) => { setMachineSerial(e.detail.value); clearError('machineSerial') }}
          />
          {errors.machineSerial && <Text className='report__error'>{errors.machineSerial}</Text>}
        </View>

        {/* Description */}
        <View className='report__card'>
          <Text className='report__label'>故障描述 *</Text>
          <textarea
            className='report__textarea'
            placeholder='请详细描述故障现象（至少 10 个字）'
            value={description}
            onInput={(e: any) => { setDescription(e.detail.value); clearError('description') }}
            maxlength={200}
          />
          <Text className='report__counter'>{description.length}/200</Text>
          {errors.description && <Text className='report__error'>{errors.description}</Text>}
        </View>

        {/* Address */}
        <View className='report__card'>
          <Text className='report__label'>服务地址 *</Text>
          <Input
            className='report__input'
            placeholder='请输入详细地址'
            value={address}
            onInput={(e) => { setAddress(e.detail.value); clearError('address') }}
          />
          {errors.address && <Text className='report__error'>{errors.address}</Text>}
        </View>

        {/* Submit */}
        <View className={`report__submit ${loading ? 'report__submit--disabled' : ''}`} onClick={handleSubmit}>
          <Text className='report__submit-text'>{loading ? '提交中...' : '提交报修'}</Text>
        </View>
      </View>
    </View>
  )
}

import { useState, useEffect } from 'react'
import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import { createWorkOrder, type CreateWorkOrderPayload } from '../../services/work-order'
import { loadPermissions } from '../../utils/permissions'
import { apiGet } from '../../utils/api-client'
import { SOURCE_OPTIONS } from '@kinho/shared-types'
import './index.scss'

const PRIORITIES: Array<{ value: CreateWorkOrderPayload['priority']; label: string }> = [
  { value: 'NORMAL', label: '普通' },
  { value: 'URGENT', label: '紧急' },
  { value: 'CRITICAL', label: '特急' },
]

interface CustomerItem { id: number; name: string; contactName: string; contactPhone: string; address: string }
interface MachineItem { id: number; serialNo: string; model: string; brand: string }

export default function OrderCreate() {
  const [title, setTitle] = useState('')
  const [faultDesc, setFaultDesc] = useState('')
  const [priority, setPriority] = useState<CreateWorkOrderPayload['priority']>('NORMAL')
  const [source, setSource] = useState<CreateWorkOrderPayload['source']>('OTHER')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [serviceAddress, setServiceAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Customer selector
  const [customers, setCustomers] = useState<CustomerItem[]>([])
  const [customerIdx, setCustomerIdx] = useState(0)
  const [selectedCust, setSelectedCust] = useState<CustomerItem | null>(null)

  // Machine selector
  const [machines, setMachines] = useState<MachineItem[]>([])
  const [machineIdx, setMachineIdx] = useState(0)
  const [selectedMach, setSelectedMach] = useState<MachineItem | null>(null)

  useEffect(() => {
    apiGet<CustomerItem[]>('/customers/all').then(d => {
      setCustomers(Array.isArray(d) ? d : [])
    }).catch(() => {})
  }, [])

  const onCustomerPicked = (e: any) => {
    const c = customers[parseInt(e.detail.value)]
    if (c) {
      setSelectedCust(c)
      setCustomerIdx(parseInt(e.detail.value))
      // Load machines for this customer
      apiGet<{ list: MachineItem[] }>('/machines', { customerId: c.id }).then(d => {
        const list = d.list || []
        setMachines(list)
        setSelectedMach(null)
      }).catch(() => setMachines([]))
      setServiceAddress(c.address || '')
    }
  }

  const onMachinePicked = (e: any) => {
    const m = machines[parseInt(e.detail.value)]
    if (m) {
      setSelectedMach(m)
      setMachineIdx(parseInt(e.detail.value))
    }
  }

  const canSubmit = title.trim() && faultDesc.trim() && selectedCust !== null

  const handleSubmit = async () => {
    if (submitting) return

    const permissions = await loadPermissions().catch(() => [])
    if (!permissions.includes('work_order:create')) {
      Taro.showToast({ title: '无权新建工单', icon: 'none' })
      return
    }

    if (!canSubmit) {
      Taro.showToast({ title: '请完整填写必填项', icon: 'none' })
      return
    }

    const cost = estimatedCost.trim() ? Number(estimatedCost) : undefined
    if (cost !== undefined && Number.isNaN(cost)) {
      Taro.showToast({ title: '预估费用格式不正确', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const order = await createWorkOrder({
        title: title.trim(),
        priority,
        source,
        customerId: selectedCust!.id,
        customerNameSnapshot: selectedCust!.contactName || selectedCust!.name,
        customerPhoneSnapshot: selectedCust!.contactPhone,
        serviceAddressSnapshot: serviceAddress || selectedCust!.address || '',
        faultDesc: faultDesc.trim(),
        machineId: selectedMach?.id,
        machineSerialSnapshot: selectedMach?.serialNo || undefined,
        machineModelSnapshot: selectedMach ? `${selectedMach.brand || ''} ${selectedMach.model}`.trim() : undefined,
        estimatedCost: cost,
      })
      Taro.showToast({ title: '工单已创建', icon: 'success' })
      setTimeout(() => {
        Taro.redirectTo({ url: `/pages/order-detail/index?id=${order.id}` })
      }, 300)
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '创建失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='order-create'>
      <PageHeader title='新建工单' />
      <View className='order-create__body'>
        {/* 客户选择 */}
        <View className='order-create__card'>
          <Text className='order-create__card-title'>客户信息</Text>
          <View className='order-create__field'>
            <Text className='order-create__label'>客户 *</Text>
            <Picker mode='selector' range={customers.map(c => `${c.name} - ${c.contactPhone}`)} value={customerIdx} onChange={onCustomerPicked}>
              <View className='order-create__picker-wrap'>
                <Text className={selectedCust ? 'order-create__picker-val' : 'order-create__picker-placeholder'}>
                  {selectedCust ? `${selectedCust.name} - ${selectedCust.contactPhone}` : customers.length > 0 ? '请选择客户' : '加载中...'}
                </Text>
                <Text className='order-create__picker-arrow'>▼</Text>
              </View>
            </Picker>
          </View>
          {selectedCust && (
            <>
              <View className='order-create__field'>
                <Text className='order-create__label'>联系人</Text>
                <Input className='order-create__input' value={selectedCust.contactName || ''} disabled />
              </View>
              <View className='order-create__field'>
                <Text className='order-create__label'>联系电话</Text>
                <Input className='order-create__input' value={selectedCust.contactPhone || ''} disabled />
              </View>
              <View className='order-create__field'>
                <Text className='order-create__label'>服务地址</Text>
                <Input className='order-create__input' value={serviceAddress} placeholder='默认使用客户地址，可按本次服务地址调整' onInput={(e) => setServiceAddress(e.detail.value)} />
              </View>
            </>
          )}
        </View>

        {/* 设备与故障 */}
        <View className='order-create__card'>
          <Text className='order-create__card-title'>设备与故障</Text>
          <View className='order-create__field'>
            <Text className='order-create__label'>工单标题 *</Text>
            <Input className='order-create__input' value={title} placeholder='例如：发动机异响检修' onInput={(e) => setTitle(e.detail.value)} />
          </View>
          {selectedCust && machines.length > 0 && (
            <View className='order-create__field'>
              <Text className='order-create__label'>关联设备</Text>
              <Picker mode='selector' range={machines.map(m => `${m.serialNo} - ${m.brand || ''} ${m.model}`)} value={machineIdx} onChange={onMachinePicked}>
                <View className='order-create__picker-wrap'>
                  <Text className={selectedMach ? 'order-create__picker-val' : 'order-create__picker-placeholder'}>
                    {selectedMach ? `${selectedMach.serialNo} - ${selectedMach.brand || ''} ${selectedMach.model}` : '请选择设备（可选）'}
                  </Text>
                  <Text className='order-create__picker-arrow'>▼</Text>
                </View>
              </Picker>
            </View>
          )}
          {selectedCust && machines.length === 0 && (
            <View className='order-create__field'>
              <Text className='order-create__label'>关联设备</Text>
              <Text className='order-create__picker-placeholder' style='padding:11px 0'>该客户暂无设备</Text>
            </View>
          )}
          {selectedMach && (
            <>
              <View className='order-create__field'>
                <Text className='order-create__label'>设备型号</Text>
                <Input className='order-create__input' value={selectedMach.brand ? `${selectedMach.brand} ${selectedMach.model}` : selectedMach.model || ''} disabled />
              </View>
              <View className='order-create__field'>
                <Text className='order-create__label'>设备编号</Text>
                <Input className='order-create__input' value={selectedMach.serialNo || ''} disabled />
              </View>
            </>
          )}
          <View className='order-create__field'>
            <Text className='order-create__label'>故障描述 *</Text>
            <Textarea
              className='order-create__textarea'
              value={faultDesc}
              placeholder='请描述故障现象、发生时间和现场情况'
              maxlength={500}
              onInput={(e) => setFaultDesc(e.detail.value)}
            />
          </View>
        </View>

        {/* 处理信息 */}
        <View className='order-create__card'>
          <Text className='order-create__card-title'>处理信息</Text>
          <View className='order-create__field'>
            <Text className='order-create__label'>优先级</Text>
            <View className='order-create__segmented'>
              {PRIORITIES.map((item) => (
                <View
                  key={item.value}
                  className={`order-create__segment ${priority === item.value ? 'order-create__segment--active' : ''}`}
                  onClick={() => setPriority(item.value)}
                >
                  <Text className='order-create__segment-text'>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View className='order-create__field'>
            <Text className='order-create__label'>来源</Text>
            <View className='order-create__segmented'>
              {SOURCE_OPTIONS.map((item) => (
                <View
                  key={item.value}
                  className={`order-create__segment ${source === item.value ? 'order-create__segment--active' : ''}`}
                  onClick={() => setSource(item.value)}
                >
                  <Text className='order-create__segment-text'>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View className='order-create__field'>
            <Text className='order-create__label'>预估费用</Text>
            <Input className='order-create__input' type='digit' value={estimatedCost} placeholder='选填' onInput={(e) => setEstimatedCost(e.detail.value)} />
          </View>
        </View>
      </View>

      <View className='order-create__footer'>
        <View className={`order-create__submit ${submitting || !canSubmit ? 'order-create__submit--disabled' : ''}`} onClick={handleSubmit}>
          <Text className='order-create__submit-text'>{submitting ? '提交中...' : '提交工单'}</Text>
        </View>
      </View>
    </View>
  )
}

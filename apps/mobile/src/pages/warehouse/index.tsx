import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { InventoryBalance, PartsRequest, PartsReturn } from '@kinho/shared-types'
import { PARTS_REQUEST_STATUS_LABELS, PARTS_RETURN_STATUS_LABELS } from '@kinho/shared-types'
import { getMyInventory, getMyPicks, getMyReturns } from '../../services/warehouse'
import { STATUS_BG } from '../../utils/status-styles'
import { loadPermissions } from '../../utils/permissions'
import './index.scss'

type TabKey = 'inventory' | 'picks' | 'returns'

export default function Warehouse() {
  const [tab, setTab] = useState<TabKey>('inventory')
  const [inventory, setInventory] = useState<InventoryBalance[]>([])
  const [picks, setPicks] = useState<PartsRequest[]>([])
  const [returns, setReturns] = useState<PartsReturn[]>([])
  const [permissions, setPermissions] = useState<string[]>([])

  useEffect(() => {
    loadPermissions()
      .then((perms) => {
        setPermissions(perms)
        const canInventory = perms.includes('menu:inventory')
        const canPicks = perms.includes('menu:parts_request')
        const canReturns = perms.includes('menu:parts_return')

        if (!canInventory && !canPicks && !canReturns) {
          Taro.showToast({ title: '无权访问该功能', icon: 'none' })
          Taro.switchTab({ url: '/pages/home/index' })
          return
        }

        if (canInventory) getMyInventory().then(setInventory).catch(() => setInventory([]))
        if (canPicks) getMyPicks().then(setPicks).catch(() => setPicks([]))
        if (canReturns) getMyReturns().then(setReturns).catch(() => setReturns([]))
        if (!canInventory) setTab(canPicks ? 'picks' : 'returns')
      })
      .catch(() => {
        Taro.showToast({ title: '权限加载失败', icon: 'none' })
        Taro.switchTab({ url: '/pages/home/index' })
      })
  }, [])

  const canInventory = permissions.includes('menu:inventory')
  const canPicks = permissions.includes('menu:parts_request')
  const canReturns = permissions.includes('menu:parts_return')
  const tabs = [
    canInventory ? { key: 'inventory' as const, label: '我的库存' } : null,
    canPicks ? { key: 'picks' as const, label: '领料记录' } : null,
    canReturns ? { key: 'returns' as const, label: '退库记录' } : null,
  ].filter(Boolean) as Array<{ key: TabKey; label: string }>

  return (
    <View className='warehouse'>
      <View className='warehouse__header'>
        <View className='warehouse__top'>
          <Text className='warehouse__title'>仓库</Text>
          {((tab === 'picks' && canPicks) || (tab === 'returns' && canReturns)) && (
            <View
              className='warehouse__add-btn'
              onClick={() => Taro.navigateTo({
                url: tab === 'picks' ? '/pages/pick-form/index' : '/pages/return-form/index',
              })}
            >
              <Text className='warehouse__add-btn-text'>+ 新建</Text>
            </View>
          )}
        </View>
        <View className='warehouse__tabs'>
          {tabs.map(({ key, label }) => (
            <View
              key={key}
              className={`warehouse__tab ${tab === key ? 'warehouse__tab--active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Text className='warehouse__tab-text'>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='warehouse__list'>
        {tab === 'inventory' && inventory.map((item) => (
          <View key={item.id} className='warehouse__item'>
            <View className='warehouse__item-row'>
              <View>
                <Text className='warehouse__item-name'>{item.partName}</Text>
                <Text className='warehouse__item-model'>{item.partModel}</Text>
              </View>
              <Text className='warehouse__item-qty'>{item.quantityAvailable}</Text>
            </View>
            <Text className='warehouse__item-detail'>
              可用 {item.quantityAvailable} / 在手 {item.quantityOnHand} / 预留 {item.quantityReserved}
            </Text>
          </View>
        ))}

        {tab === 'picks' && picks.map((pick) => {
          const bg = STATUS_BG[pick.status] || ''
          return (
            <View
              key={pick.id}
              className='warehouse__card'
              onClick={() => Taro.navigateTo({ url: `/pages/pick-detail/index?id=${pick.id}` })}
            >
              <View className='warehouse__card-row'>
                <Text className='warehouse__card-no'>{pick.requestNo}</Text>
                <View className={`warehouse__badge ${bg}`}>
                  <Text className='warehouse__badge-text'>{PARTS_REQUEST_STATUS_LABELS[pick.status]}</Text>
                </View>
              </View>
              <Text className='warehouse__card-sub'>关联工单: {pick.workOrderNo || '-'}</Text>
              <Text className='warehouse__card-sub'>{pick.createdAt.slice(0, 10)}</Text>
            </View>
          )
        })}

        {tab === 'returns' && returns.map((ret) => {
          const bg = STATUS_BG[ret.status] || ''
          return (
            <View
              key={ret.id}
              className='warehouse__card'
              onClick={() => Taro.navigateTo({ url: `/pages/return-detail/index?id=${ret.id}` })}
            >
              <View className='warehouse__card-row'>
                <Text className='warehouse__card-no'>{ret.returnNo}</Text>
                <View className={`warehouse__badge ${bg}`}>
                  <Text className='warehouse__badge-text'>{PARTS_RETURN_STATUS_LABELS[ret.status]}</Text>
                </View>
              </View>
              <Text className='warehouse__card-sub'>关联工单: {ret.workOrderNo || '-'}</Text>
              <Text className='warehouse__card-sub'>{ret.createdAt.slice(0, 10)}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ProcurementRequest } from '@kinho/shared-types'
import { PROCUREMENT_STATUS_LABELS } from '@kinho/shared-types'
import { getProcurements } from '../../services/procurement'
import { STATUS_BG } from '../../utils/status-styles'
import { ensurePermission } from '../../utils/permissions'
import './index.scss'

const DONE_STATUSES: ProcurementRequest['status'][] = ['APPROVED', 'ORDERED', 'RECEIVED', 'REJECTED', 'CANCELLED']

export default function ProcurementList() {
  const [tab, setTab] = useState<'pending' | 'done'>('pending')
  const [all, setAll] = useState<ProcurementRequest[]>([])

  useEffect(() => {
    ensurePermission('menu:procurement').then((allowed) => {
      if (allowed) getProcurements().then(setAll).catch(() => setAll([]))
    })
  }, [])

  const pending = all.filter((p) => !DONE_STATUSES.includes(p.status))
  const done = all.filter((p) => DONE_STATUSES.includes(p.status))
  const list = tab === 'pending' ? pending : done

  return (
    <View className='proc-list'>
      <View className='proc-list__header'>
        <View className='proc-list__top'>
          <Text className='proc-list__title'>采购管理</Text>
          <View
            className='proc-list__create-btn'
            onClick={() => Taro.navigateTo({ url: '/pages/procurement-form/index' })}
          >
            <Text className='proc-list__create-text'>+ 新建采购</Text>
          </View>
        </View>
        <View className='proc-list__tabs'>
          <View
            className={`proc-list__tab ${tab === 'pending' ? 'proc-list__tab--active' : ''}`}
            onClick={() => setTab('pending')}
          >
            <Text className='proc-list__tab-text'>待处理 ({pending.length})</Text>
          </View>
          <View
            className={`proc-list__tab ${tab === 'done' ? 'proc-list__tab--active' : ''}`}
            onClick={() => setTab('done')}
          >
            <Text className='proc-list__tab-text'>已完成 ({done.length})</Text>
          </View>
        </View>
      </View>

      <View className='proc-list__body'>
        {list.length === 0 ? (
          <View className='proc-list__empty'>
            <Text>{tab === 'pending' ? '暂无待处理采购' : '暂无已完成采购'}</Text>
          </View>
        ) : (
          list.map((item) => {
            const colorClass = STATUS_BG[item.status] || ''
            return (
              <View
                key={item.id}
                className='proc-list__card'
                onClick={() => Taro.navigateTo({ url: `/pages/procurement-detail/index?id=${item.id}` })}
              >
                <View className='proc-list__card-row'>
                  <View>
                    <Text className='proc-list__card-no'>{item.procurementNo}</Text>
                    <Text className='proc-list__card-sub'>{item.workOrderNo}</Text>
                    <Text className='proc-list__card-sub'>创建人：{item.createdByName}</Text>
                  </View>
                  <View className='proc-list__card-right'>
                    <View className={`proc-list__badge ${colorClass}`}>
                      <Text className='proc-list__badge-text'>{PROCUREMENT_STATUS_LABELS[item.status]}</Text>
                    </View>
                    <Text className='proc-list__card-cost'>¥{item.estimatedCost.toLocaleString()}</Text>
                  </View>
                </View>
                <Text className='proc-list__card-date'>{item.createdAt.slice(0, 10)}</Text>
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}

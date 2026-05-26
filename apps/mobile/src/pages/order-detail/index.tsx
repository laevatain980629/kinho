import { useState, useEffect } from 'react'
import { View, Text, Picker, Textarea, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHeader from '../../components/PageHeader'
import LoadingView from '../../components/LoadingView'
import PhotoUpload, { TaroAttachment } from '../../components/PhotoUpload'
import { WORK_ORDER_STATE_LABELS, WORK_ORDER_PRIORITY_LABELS } from '@kinho/shared-types'
import { getWorkOrderById, signIn, startRepair, escalate, acceptOrder } from '../../services/work-order'
import { getCurrentUser } from '../../utils/current-user'
import './index.scss'

const STATE_TAG: Record<string, string> = {
  CREATED: 'bg-blue',
  ACCEPTED: 'bg-blue',
  OUTLET_ASSIGNED: 'bg-blue',
  ENGINEER_ASSIGNED: 'bg-amber',
  SIGNED_IN: 'bg-blue',
  FAULT_CONFIRMED: 'bg-amber',
  REPAIRING: 'bg-amber',
  PENDING_SIGNATURE: 'bg-gray',
  REPAIR_COMPLETED: 'bg-green',
  FOLLOW_UP_PENDING: 'bg-gray',
  CLOSED: 'bg-gray',
  CANCELLED: 'bg-red',
}

function formatTime(value?: string) {
  return value ? new Date(value).toLocaleString() : ''
}

export default function OrderDetail() {
  const params = Taro.getCurrentInstance().router?.params || {}
  const id = Number(params.id)
  const currentUser = getCurrentUser()
  const [detail, setDetail] = useState<any>(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEscalate, setShowEscalate] = useState(false)
  const [escalateReason, setEscalateReason] = useState('')
  const [showAcceptForm, setShowAcceptForm] = useState(false)
  const [acceptPriority, setAcceptPriority] = useState('')
  const [acceptRemark, setAcceptRemark] = useState('')
  const [acceptOfficialTitle, setAcceptOfficialTitle] = useState('')
  const [showEscalationForm, setShowEscalationForm] = useState(false)
  const [escalationId, setEscalationId] = useState(0)
  const [escalationSolution, setEscalationSolution] = useState('')
  const [escalationPhotos, setEscalationPhotos] = useState<TaroAttachment[]>([])

  const loadDetail = async () => {
    if (!id) {
      setError('缺少工单 ID')
      setFetching(false)
      return
    }

    try {
      const data = await getWorkOrderById(id)
      // 裁掉 histories/receipts 避免 setData 超 256KB 限制
      setDetail({ ...data, histories: undefined, receipts: undefined })
      setError('')
    } catch (err: any) {
      const message = err?.message || '加载工单失败'
      setError(message)
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [id])

  const navTo = (path: string) => Taro.navigateTo({ url: path })

  const refresh = async () => {
    const data = await getWorkOrderById(id)
    setDetail({ ...data, histories: undefined, receipts: undefined })
  }

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signIn(id)
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '签到失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleStartRepair = async () => {
    setLoading(true)
    try {
      await startRepair(id)
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '开始维修失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleEscalate = async () => {
    if (!escalateReason.trim()) return
    setLoading(true)
    try {
      await escalate(id, escalateReason.trim())
      setShowEscalate(false)
      setEscalateReason('')
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '申请升级失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 受理：支持快速确认或带表单
  const handleAccept = async () => {
    if (!acceptPriority && !acceptRemark.trim()) {
      const res = await Taro.showModal({ title: '确认受理', content: '确认受理此工单？' })
      if (!res.confirm) return
    }
    setLoading(true)
    try {
      await acceptOrder(id, { priority: acceptPriority || undefined, remark: acceptRemark.trim() || undefined, officialTitle: acceptOfficialTitle.trim() || undefined })
      Taro.showToast({ title: '已受理', icon: 'success' })
      setShowAcceptForm(false)
      setAcceptPriority('')
      setAcceptRemark('')
      setAcceptOfficialTitle('')
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '受理失败', icon: 'none' })
    } finally { setLoading(false) }
  }

  // 派网点：Picker 选择 (fetch on mount)
  const [outlets, setOutlets] = useState<any[]>([])
  const [outletIdx, setOutletIdx] = useState(0)

  useEffect(() => {
    const role = currentUser?.role || ''
    if (role !== 'hq_service' && role !== 'admin') return
    import('../../services/work-order').then(({ getOutlets }) => {
      getOutlets().then(list => {
        setOutlets(Array.isArray(list) ? list.filter((o: any) => o.status === 'ACTIVE') : [])
      }).catch(() => {})
    }).catch(() => {})
  }, [])

  // Dispatch: after picking outlet, show reason/ETA form
  const [pickedOutlet, setPickedOutlet] = useState<any>(null)
  const [dispatchReason, setDispatchReason] = useState('')
  const [expectedArriveAt, setExpectedArriveAt] = useState('')

  const onOutletPicked = (e: any) => {
    const idx = parseInt(e.detail.value)
    const outlet = outlets[idx]
    if (!outlet) return
    setOutletIdx(idx)
    setPickedOutlet(outlet)
    setDispatchReason('')
    setExpectedArriveAt('')
  }

  const confirmDispatch = async () => {
    if (!pickedOutlet) return
    setLoading(true)
    try {
      const { assignOutlet } = await import('../../services/work-order')
      await assignOutlet(id, pickedOutlet.id, {
        dispatchReason: dispatchReason.trim() || undefined,
        expectedArriveAt: expectedArriveAt || undefined,
      })
      Taro.showToast({ title: `已派至${pickedOutlet.name}`, icon: 'success' })
      setPickedOutlet(null)
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '派网点失败', icon: 'none' })
    } finally { setLoading(false) }
  }

  // 指派工程师：Picker 选择
  const [engineers, setEngineers] = useState<any[]>([])
  const [engIdx, setEngIdx] = useState(0)
  const [showEng, setShowEng] = useState(false)

  const handleAssignEngineer = async () => {
    if (!detail.outletId) {
      Taro.showToast({ title: '工单未关联网点，无法指派工程师', icon: 'none' })
      return
    }
    try {
      const { getOutletEngineers } = await import('../../services/work-order')
      const list = await getOutletEngineers(detail.outletId)
      if (list.length === 0) {
        Taro.showToast({ title: '该网点暂无工程师', icon: 'none' })
        return
      }
      setEngineers(list)
      setEngIdx(0)
      setShowEng(true)
    } catch { Taro.showToast({ title: '获取工程师列表失败', icon: 'none' }) }
  }

  const onEngPicked = async (e: any) => {
    const idx = parseInt(e.detail.value)
    const eng = engineers[idx]
    if (!eng) return
    setShowEng(false)
    setLoading(true)
    try {
      const { assignEngineer } = await import('../../services/work-order')
      await assignEngineer(id, eng.id)
      Taro.showToast({ title: `已指派${eng.name}`, icon: 'success' })
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '指派失败', icon: 'none' })
    } finally { setLoading(false) }
  }

  const handleFollowUpComplete = async () => {
    setLoading(true)
    try {
      const { completeFollowUp } = await import('../../services/work-order')
      await completeFollowUp(id)
      Taro.showToast({ title: '回访完成', icon: 'success' })
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '操作失败', icon: 'none' })
    } finally { setLoading(false) }
  }

  const handleClose = async () => {
    const res = await Taro.showModal({ title: '关闭工单', content: '确认关闭此工单？' })
    if (!res.confirm) return
    setLoading(true)
    try {
      const { closeOrder } = await import('../../services/work-order')
      await closeOrder(id)
      Taro.showToast({ title: '已关闭', icon: 'success' })
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '关闭失败', icon: 'none' })
    } finally { setLoading(false) }
  }

  const handleHold = async () => {
    const res = await Taro.showModal({ title: '挂起工单', content: '请输入挂起原因', editable: true, placeholderText: '等待配件到货' })
    if (!res.confirm) return
    setLoading(true)
    try {
      const { holdWorkOrder } = await import('../../services/work-order')
      await holdWorkOrder(id, (res as any).content || '手动挂起')
      Taro.showToast({ title: '已挂起', icon: 'success' })
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '挂起失败', icon: 'none' })
    } finally { setLoading(false) }
  }

  const handleCancel = async () => {
    const res = await Taro.showModal({ title: '取消工单', content: '确认取消此工单？此操作不可撤销' })
    if (!res.confirm) return
    setLoading(true)
    try {
      const { cancelWorkOrder } = await import('../../services/work-order')
      await cancelWorkOrder(id)
      Taro.showToast({ title: '已取消', icon: 'success' })
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '取消失败', icon: 'none' })
    } finally { setLoading(false) }
  }

  const handleReturnToRepair = async () => {
    const res = await Taro.showModal({ title: '退回维修', content: '确认将此工单退回维修阶段？回访异常将标记为待处理' })
    if (!res.confirm) return
    setLoading(true)
    try {
      const { returnToRepairWorkOrder } = await import('../../services/work-order')
      await returnToRepairWorkOrder(id)
      Taro.showToast({ title: '已退回维修', icon: 'success' })
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '操作失败', icon: 'none' })
    } finally { setLoading(false) }
  }

  const handleReopen = async () => {
    setLoading(true)
    try {
      const { reopenWorkOrder } = await import('../../services/work-order')
      await reopenWorkOrder(id)
      Taro.showToast({ title: '已重开', icon: 'success' })
      await refresh()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '重开失败', icon: 'none' })
    } finally { setLoading(false) }
  }

  if (fetching) {
    return (
      <View className='order-detail'>
        <PageHeader title='工单详情' />
        <LoadingView />
      </View>
    )
  }

  if (!detail) {
    return (
      <View className='order-detail'>
        <PageHeader title='工单详情' />
        <View className='order-detail__body'>
          <Text className='order-detail__empty'>{error || '未找到工单'}</Text>
        </View>
      </View>
    )
  }

  const role = currentUser?.role || ''
  const isAdmin = role === 'admin'
  const isAssigned = currentUser?.id === detail.engineerId
  // Aligned with PC: only the assigned engineer can operate on a work order
  const canEngineer = isAdmin || isAssigned
  const canHQ = isAdmin || role === 'hq_service'
  const canMgr = isAdmin || (role === 'outlet_manager' && currentUser?.outletId === detail.outletId)
  const canFU = isAdmin || role === 'follow_up_specialist'
  const canOperate = isAdmin || isAssigned || role === 'hq_service' || (role === 'outlet_manager' && currentUser?.outletId === detail.outletId) || role === 'supervisor' || role === 'chief_engineer' || role === 'follow_up_specialist'
  const timeline = [
    { state: '已创建', time: formatTime(detail.createdAt), done: true, current: false },
    { state: '已受理', time: formatTime(detail.acceptedAt), done: !!detail.acceptedAt, current: detail.state === 'ACCEPTED' },
    { state: '已派网点', time: formatTime(detail.outletAssignedAt), done: !!detail.outletAssignedAt, current: detail.state === 'OUTLET_ASSIGNED' },
    { state: '已派工程师', time: formatTime(detail.engineerAssignedAt), done: !!detail.engineerAssignedAt, current: detail.state === 'ENGINEER_ASSIGNED' },
    { state: '已签到', time: formatTime(detail.signedInAt), done: !!detail.signedInAt, current: detail.state === 'SIGNED_IN' },
    { state: '故障已确认', time: formatTime(detail.faultConfirmedAt), done: !!detail.faultConfirmedAt, current: detail.state === 'FAULT_CONFIRMED' },
    { state: '维修中', time: formatTime(detail.repairStartedAt), done: !!detail.repairStartedAt, current: detail.state === 'REPAIRING' },
    { state: '维修完成', time: formatTime(detail.repairCompletedAt || detail.receiptSubmittedAt), done: !!detail.receiptSubmittedAt || !!detail.customerSignedAt, current: detail.state === 'REPAIR_COMPLETED' },
    { state: '待回访', time: formatTime(detail.closedAt), done: !!detail.closedAt || detail.state === 'FOLLOW_UP_PENDING', current: detail.state === 'FOLLOW_UP_PENDING' },
  ].filter((item) => item.time || item.current || item.done)

  return (
    <View className='order-detail'>
      <PageHeader title='工单详情' />
      <View className='order-detail__body'>
        <View className='order-detail__card'>
          <View className='order-detail__card-top'>
            <View>
              <Text className='order-detail__no'>{detail.orderNo}</Text>
              <Text className='order-detail__title'>{detail.officialTitle || detail.title}</Text>
              {detail.customerTitleSnapshot && detail.customerTitleSnapshot !== (detail.officialTitle || detail.title) && (
                <Text className='order-detail__subtitle'>客户原报：{detail.customerTitleSnapshot}</Text>
              )}
            </View>
            <View className='order-detail__chips'>
              <View className={`order-detail__chip ${STATE_TAG[detail.state] || 'bg-gray'}`}>
                <Text className='order-detail__chip-text'>{WORK_ORDER_STATE_LABELS[detail.state] || detail.state}</Text>
              </View>
              <View className={`order-detail__chip ${detail.priority === 'URGENT' ? 'bg-red' : 'bg-gray'}`}>
                <Text className='order-detail__chip-text'>{WORK_ORDER_PRIORITY_LABELS[detail.priority] || detail.priority}</Text>
              </View>
              <View className={`order-detail__chip ${detail.isUnderWarranty ? 'bg-green' : 'bg-red'}`}>
                <Text className='order-detail__chip-text'>{detail.isUnderWarranty ? '保修' : '收费'}</Text>
              </View>
            </View>
          </View>
          <View className='order-detail__info'>
            <Text className='order-detail__info-item'>客户：{detail.customerNameSnapshot || '-'}</Text>
            <Text className='order-detail__info-item'>电话：{detail.customerPhoneSnapshot || '-'}</Text>
            <Text className='order-detail__info-item'>机台：{detail.machineModelSnapshot || '-'}</Text>
            <Text className='order-detail__info-item'>网点：{detail.outletName || '-'}</Text>
            {detail.engineerName && <Text className='order-detail__info-item'>工程师：{detail.engineerName}</Text>}
          </View>
          <Text className='order-detail__addr'>地址：{detail.serviceAddressSnapshot || '-'}</Text>

          {/* 受理备注 */}
          {detail.acceptRemark && (
            <View className='order-detail__remark'>
              <Text className='order-detail__remark-label'>受理备注</Text>
              <Text className='order-detail__remark-text'>{detail.acceptRemark}</Text>
            </View>
          )}

          {/* 挂起状态提示 */}
          {detail.holdStatus === 'HELD' && (
            <View className='order-detail__held-banner'>
              <Text className='order-detail__held-title'>已挂起</Text>
              <Text className='order-detail__held-reason'>{detail.holdReason || '未填写原因'}</Text>
              {canEngineer && (
                (detail.holdReason || '').startsWith('升级申请') ? (
                  <View className='order-detail__btn order-detail__btn--primary' style={{marginTop:'12px'}} onClick={async () => {
                    setLoading(true)
                    try {
                      const { getEscalations } = await import('../../services/work-order')
                      const list = await getEscalations(id)
                      const pending = list.find((e: any) => e.status === 'PENDING_CHIEF' || e.status === 'ACCEPTED')
                      if (!pending) { Taro.showToast({ title: '未找到待处理的升级单', icon: 'none' }); return }
                      setEscalationId(pending.id)
                      setEscalationSolution('')
                      setEscalationPhotos([])
                      setShowEscalationForm(true)
                    } catch { Taro.showToast({ title: '加载升级单失败', icon: 'none' }) }
                    finally { setLoading(false) }
                  }}>
                    <Text className='order-detail__btn-text'>处理升级</Text>
                  </View>
                ) : (
                  <View className='order-detail__btn order-detail__btn--secondary' style={{marginTop:'12px'}} onClick={async () => {
                    setLoading(true)
                    try {
                      const { unholdWorkOrder } = await import('../../services/work-order')
                      await unholdWorkOrder(id)
                      Taro.showToast({ title: '已解除挂起', icon: 'success' })
                      await refresh()
                    } catch (err: any) {
                      Taro.showToast({ title: err?.message || '解除挂起失败', icon: 'none' })
                    } finally { setLoading(false) }
                  }}>
                    <Text className='order-detail__btn-text2'>解除挂起</Text>
                  </View>
                )
              )}
            </View>
          )}
        </View>

        <View className='order-detail__actions'>
          {canOperate ? (
            <>
              {/* === 总部客服 === */}
              {/* === CREATED: 受理 (hq_service + admin) === */}
              {canHQ && detail.state === 'CREATED' && (
                <View className='order-detail__btn order-detail__btn--primary' onClick={() => setShowAcceptForm(true)}>
                  <Text className='order-detail__btn-text'>受理</Text>
                </View>
              )}

              {/* === ACCEPTED: 派网点 Picker === */}
              {canHQ && detail.state === 'ACCEPTED' && (
                <Picker mode='selector' range={outlets.map((o: any) => `${o.name} - ${o.code || o.address || ''}`)} value={outletIdx} onChange={onOutletPicked}>
                  <View className='order-detail__btn order-detail__btn--primary'>
                    <Text className='order-detail__btn-text'>派网点</Text>
                  </View>
                </Picker>
              )}

              {/* === OUTLET_ASSIGNED: 指派Picker + 重派Picker === */}
              {canMgr && detail.state === 'OUTLET_ASSIGNED' && (
                <>
                  {showEng ? (
                    <Picker mode='selector' range={engineers.map((e: any) => `${e.name} - ${e.phone || ''}`)} value={engIdx} onChange={onEngPicked} onCancel={() => setShowEng(false)}>
                      <View className='order-detail__btn order-detail__btn--primary'>
                        <Text className='order-detail__btn-text'>点击选择工程师 ▼</Text>
                      </View>
                    </Picker>
                  ) : (
                    <View className='order-detail__btn order-detail__btn--primary' onClick={handleAssignEngineer}>
                      <Text className='order-detail__btn-text'>指派工程师</Text>
                    </View>
                  )}
                  <Picker mode='selector' range={outlets.map((o: any) => `${o.name} - ${o.code || o.address || ''}`)} value={outletIdx} onChange={onOutletPicked}>
                    <View className='order-detail__btn order-detail__btn--secondary'>
                      <Text className='order-detail__btn-text2'>↻ 重新派网点</Text>
                    </View>
                  </Picker>
                </>
              )}

              {/* === ENGINEER_ASSIGNED: 签到+重派 (engineer + admin) === */}
              {canEngineer && detail.state === 'ENGINEER_ASSIGNED' && (
                <>
                  <View className='order-detail__btn order-detail__btn--primary' onClick={handleSignIn}>
                    <Text className='order-detail__btn-text'>{loading ? '处理中...' : '签到'}</Text>
                  </View>
                  <View className='order-detail__btn order-detail__btn--secondary' onClick={handleAssignEngineer}>
                    <Text className='order-detail__btn-text2'>↻ 重新派工程师</Text>
                  </View>
                </>
              )}

              {/* === SIGNED_IN: 确认故障 (engineer + admin) === */}
              {canEngineer && detail.state === 'SIGNED_IN' && (
                <View className='order-detail__btn order-detail__btn--primary' onClick={() => navTo(`/pages/fault-confirm/index?id=${id}`)}>
                  <Text className='order-detail__btn-text'>确认故障</Text>
                </View>
              )}

              {/* === FAULT_CONFIRMED: 开始维修 (engineer + admin) === */}
              {canEngineer && detail.state === 'FAULT_CONFIRMED' && (
                <View className='order-detail__btn order-detail__btn--primary' onClick={handleStartRepair}>
                  <Text className='order-detail__btn-text'>{loading ? '处理中...' : '开始维修'}</Text>
                </View>
              )}

              {/* === REPAIRING: 提交回执+升级+挂起 (engineer + admin) === */}
              {canEngineer && detail.state === 'REPAIRING' && (
                <>
                  <View className='order-detail__btn order-detail__btn--primary' onClick={() => navTo(`/pages/receipt/index?id=${id}`)}>
                    <Text className='order-detail__btn-text'>提交回执</Text>
                  </View>
                  <View className='order-detail__btn order-detail__btn--secondary' onClick={() => { setShowEscalate(!showEscalate); setEscalateReason('') }}>
                    <Text className='order-detail__btn-text2'>申请升级</Text>
                  </View>
                  {showEscalate && (
                    <View className='order-detail__escalate'>
                      <Textarea className='order-detail__textarea' value={escalateReason} placeholder='请输入升级原因' onInput={(e: any) => setEscalateReason(e.detail.value)} />
                      <View className={`order-detail__escalate-btn ${!escalateReason.trim() ? 'order-detail__escalate-btn--disabled' : ''}`} onClick={() => { if (escalateReason.trim()) handleEscalate() }}>
                        <Text className='order-detail__btn-text'>确认升级</Text>
                      </View>
                    </View>
                  )}
                  <View className='order-detail__btn order-detail__btn--secondary' onClick={handleHold}>
                    <Text className='order-detail__btn-text2'>挂起</Text>
                  </View>
                </>
              )}

              {/* === PENDING_SIGNATURE: 客户签字 (engineer + admin) === */}
              {canEngineer && detail.state === 'PENDING_SIGNATURE' && (
                <View className='order-detail__btn order-detail__btn--primary' onClick={() => navTo(`/pages/signature/index?id=${id}`)}>
                  <Text className='order-detail__btn-text'>客户签字</Text>
                </View>
              )}

              {/* === FOLLOW_UP_PENDING: 完成回访+退回维修 (follow_up + admin) === */}
              {canFU && detail.state === 'FOLLOW_UP_PENDING' && (
                <>
                  <View className='order-detail__btn order-detail__btn--primary' onClick={handleFollowUpComplete}>
                    <Text className='order-detail__btn-text'>完成回访</Text>
                  </View>
                  <View className='order-detail__btn order-detail__btn--secondary' onClick={handleReturnToRepair}>
                    <Text className='order-detail__btn-text2'>退回维修</Text>
                  </View>
                </>
              )}

              {/* === Admin 特权: 取消工单 === */}
              {isAdmin && !['CLOSED','CANCELLED'].includes(detail.state) && (
                <View className='order-detail__btn order-detail__btn--danger' onClick={handleCancel}>
                  <Text className='order-detail__btn-text'>取消工单</Text>
                </View>
              )}

              {/* === Admin 特权: 重开工单 === */}
              {isAdmin && detail.state === 'CLOSED' && (
                <View className='order-detail__btn order-detail__btn--secondary' onClick={handleReopen}>
                  <Text className='order-detail__btn-text2'>重开工单</Text>
                </View>
              )}

              {/* 无匹配操作时提示 */}
              {!canOperate && (
                <View className='order-detail__hint'>
                  <Text className='order-detail__hint-text'>当前工单不属于您的操作范围</Text>
                </View>
              )}
            </>
          ) : (
            <View className='order-detail__hint'>
              <Text className='order-detail__hint-text'>当前工单不属于您的操作范围</Text>
            </View>
          )}
        </View>

        <View className='order-detail__card'>
          <Text className='order-detail__section-title'>流程进度</Text>
          <View className='order-detail__timeline'>
            <View className='order-detail__timeline-line' />
            {timeline.map((item, i) => (
              <View key={i} className='order-detail__timeline-step'>
                <View className={`order-detail__timeline-dot ${item.current ? 'order-detail__timeline-dot--current' : item.done ? 'order-detail__timeline-dot--done' : ''}`} />
                <Text className={`order-detail__timeline-label ${item.current ? 'order-detail__timeline-label--current' : ''}`}>{item.state}</Text>
                <Text className='order-detail__timeline-sub'>{item.time}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Dispatch confirm form (after outlet picked) */}
      {pickedOutlet && (
        <View className='order-detail__escalate'>
          <Text className='order-detail__section-title'>派单至 {pickedOutlet.name}</Text>
          <View className='order-detail__field'>
            <Text className='order-detail__label'>派单原因（可选）</Text>
            <Textarea className='order-detail__textarea' value={dispatchReason} placeholder='请输入派单原因' onInput={(e: any) => setDispatchReason(e.detail.value)} />
          </View>
          <View className='order-detail__field'>
            <Text className='order-detail__label'>预计到达时间（可选）</Text>
            <Input className='order-detail__input' value={expectedArriveAt} placeholder='如：2026-05-10 14:00' onInput={(e: any) => setExpectedArriveAt(e.detail.value)} />
          </View>
          <View style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <View className='order-detail__btn order-detail__btn--secondary' onClick={() => setPickedOutlet(null)}>
              <Text className='order-detail__btn-text2'>取消</Text>
            </View>
            <View className='order-detail__btn order-detail__btn--primary' onClick={confirmDispatch}>
              <Text className='order-detail__btn-text'>{loading ? '处理中...' : '确认派单'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Accept form */}
      {showAcceptForm && (
        <View className='order-detail__escalate'>
          <Text className='order-detail__section-title'>受理工单</Text>
          <View className='order-detail__field'>
            <Text className='order-detail__label'>正式标题（可选，留空则自动生成）</Text>
            <Input className='order-detail__input' value={acceptOfficialTitle} placeholder='输入正式工单标题...' onInput={(e: any) => setAcceptOfficialTitle(e.detail.value)} />
          </View>
          <View className='order-detail__field'>
            <Text className='order-detail__label'>优先级调整（可选）</Text>
            <View style={{ display: 'flex', gap: '8px' }}>
              {(['NORMAL','URGENT','CRITICAL'] as const).map(p => (
                <View key={p} className={`order-detail__btn order-detail__btn--${acceptPriority===p?'primary':'secondary'}`} style={{flex:1}} onClick={() => setAcceptPriority(p)}>
                  <Text className='order-detail__btn-text2'>{p==='NORMAL'?'普通':p==='URGENT'?'紧急':'严重'}</Text>
                </View>
              ))}
            </View>
          </View>
          <View className='order-detail__field'>
            <Text className='order-detail__label'>受理备注（可选）</Text>
            <Textarea className='order-detail__textarea' value={acceptRemark} placeholder='填写受理备注...' onInput={(e: any) => setAcceptRemark(e.detail.value)} />
          </View>
          <View style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <View className='order-detail__btn order-detail__btn--secondary' onClick={() => { setShowAcceptForm(false); setAcceptPriority(''); setAcceptRemark(''); setAcceptOfficialTitle('') }}>
              <Text className='order-detail__btn-text2'>取消</Text>
            </View>
            <View className='order-detail__btn order-detail__btn--primary' onClick={handleAccept}>
              <Text className='order-detail__btn-text'>{loading ? '处理中...' : '确认受理'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Escalation resolution form */}
      {showEscalationForm && (
        <View className='order-detail__escalate'>
          <Text className='order-detail__section-title'>处理升级</Text>
          <View className='order-detail__field'>
            <Text className='order-detail__label'>解决方案 *</Text>
            <Textarea className='order-detail__textarea' value={escalationSolution} placeholder='请提供维修方案、指导步骤等...' onInput={(e: any) => setEscalationSolution(e.detail.value)} />
          </View>
          <View className='order-detail__field'>
            <Text className='order-detail__label'>相关照片（可选）</Text>
            <PhotoUpload value={escalationPhotos} onChange={setEscalationPhotos} max={9} />
          </View>
          <View style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <View className='order-detail__btn order-detail__btn--secondary' onClick={() => { setShowEscalationForm(false); setEscalationSolution(''); setEscalationPhotos([]) }}>
              <Text className='order-detail__btn-text2'>取消</Text>
            </View>
            <View className={`order-detail__btn order-detail__btn--primary ${!escalationSolution.trim() ? 'order-detail__btn--disabled' : ''}`} onClick={async () => {
              if (!escalationSolution.trim()) return
              setLoading(true)
              try {
                const { resolveEscalation } = await import('../../services/work-order')
                const photos = escalationPhotos.map(p => ({ url: p.tempFilePath, name: p.name, size: p.size }))
                await resolveEscalation(escalationId, escalationSolution.trim(), photos.length > 0 ? photos : undefined)
                Taro.showToast({ title: '处理完成，工单已解除挂起', icon: 'success' })
                setShowEscalationForm(false)
                setEscalationSolution('')
                setEscalationPhotos([])
                await refresh()
              } catch (err: any) {
                Taro.showToast({ title: err?.message || '提交失败', icon: 'none' })
              } finally { setLoading(false) }
            }}>
              <Text className='order-detail__btn-text'>{loading ? '处理中...' : '提交方案并解除挂起'}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

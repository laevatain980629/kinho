import { useParams, useNavigate } from 'react-router';
import { Card, Chip, Button, Modal, Spinner } from '@heroui/react';
import {
  ArrowLeft, CheckCircle,
  Wrench, FileText, AlertTriangle, UserCheck, MapPin,
  Clock, Ban, RotateCcw, ChevronRight, Package,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { WorkOrderDetail as WorkOrderDetailType, WorkOrderHistory, User } from '@kinho/shared-types';
import { WORK_ORDER_STATE_LABELS, WORK_ORDER_PRIORITY_LABELS, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@kinho/shared-types';
import { LoadingView, ErrorView, toast } from '@kinho/shared-components';
import { getQuotesByWorkOrder } from '@/services/quote';
import {
  getWorkOrderById,
  getWorkOrderHistory,
  acceptWorkOrder,
  assignOutlet,
  assignWorkOrder,
  signInWorkOrder,
  startRepair,
  createReceipt,
  moveToFollowUp,
  closeWorkOrder,
  reopenWorkOrder,
  returnToRepairWorkOrder,
  confirmCancelWorkOrder,
  holdWorkOrder,
  unholdWorkOrder,
  confirmFault,
  cancelWorkOrder,
} from '@/services/work-order';
import { createEscalation, resolveEscalation, getEscalations } from '@/services/escalation';
import { apiGet } from '@/utils/api-client';
import AssignModal from '@/components/AssignModal';
import AcceptForm from '@/components/forms/AcceptForm';
import DispatchForm from '@/components/forms/DispatchForm';
import FaultConfirmForm from '@/components/forms/FaultConfirmForm';
import ReceiptForm from '@/components/forms/ReceiptForm';
import FollowUpForm from '@/components/forms/FollowUpForm';
import CloseOrderForm from '@/components/forms/CloseOrderForm';
import CancelOrderForm from '@/components/forms/CancelOrderForm';
import FollowUpCompleteForm from '@/components/forms/FollowUpCompleteForm';
import FollowUpExceptionForm from '@/components/forms/FollowUpExceptionForm';
import ChiefHandleForm from '@/components/forms/ChiefHandleForm';
import { completeFollowUp, getFollowUps, createFollowUp, reportFollowUpException } from '@/services/follow-up';
import { getCurrentUser } from '@/utils/current-user';

const STATE_CHIP_COLORS: Record<string, 'accent' | 'warning' | 'default' | 'success' | 'danger'> = {
  CREATED: 'accent', ACCEPTED: 'accent', OUTLET_ASSIGNED: 'accent',
  ENGINEER_ASSIGNED: 'accent', SIGNED_IN: 'default', FAULT_CONFIRMED: 'default',
  REPAIRING: 'warning', PENDING_SIGNATURE: 'default', REPAIR_COMPLETED: 'success',
  FOLLOW_UP_PENDING: 'accent', CLOSED: 'success', CANCELLED: 'danger',
};

function getWarrantyChip(detail: WorkOrderDetailType): { label: string; color: 'success' | 'danger' | 'default' } {
  if (detail.warrantyStatus === 'IN_WARRANTY' || detail.isUnderWarranty === true) return { label: '三包内', color: 'success' };
  if (detail.warrantyStatus === 'OUT_OF_WARRANTY' || detail.isUnderWarranty === false) return { label: '三包外', color: 'danger' };
  return { label: '三包未确认', color: 'default' };
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : '未配置';
}

function parsePhotoList(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
  } catch {
    return [];
  }
}

function getHandlerLabel(state: string, engineerName?: string, outletName?: string): string {
  switch (state) {
    case 'CREATED': return '总部客服（待受理）';
    case 'ACCEPTED': return '总部客服（待派网点）';
    case 'OUTLET_ASSIGNED': return `${outletName || '网点'} 网点经理（待指派工程师）`;
    case 'ENGINEER_ASSIGNED': return `${engineerName || '工程师'}（待签到）`;
    case 'SIGNED_IN': return `${engineerName || '工程师'}（待确认故障）`;
    case 'FAULT_CONFIRMED': return `${engineerName || '工程师'}（待开始维修）`;
    case 'REPAIRING': return `${engineerName || '工程师'}（维修中）`;
    case 'PENDING_SIGNATURE': return `${engineerName || '工程师'}（待客户签字）`;
    case 'REPAIR_COMPLETED': return '回访专员（待回访）';
    case 'FOLLOW_UP_PENDING': return '回访专员（待确认）';
    case 'CLOSED': return '—（已结束）';
    case 'CANCELLED': return '—（已取消）';
    default: return '未知';
  }
}

function buildTimeline(detail: WorkOrderDetailType) {
  const steps: { state: string; time: string; done: boolean; current?: boolean }[] = [];
  const add = (label: string, ts: string | null | undefined) => {
    if (ts) steps.push({ state: label, time: new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), done: true });
  };
  add('已创建', detail.createdAt); add('已受理', detail.acceptedAt);
  add('已派网点', detail.outletAssignedAt); add('已派工程师', detail.engineerAssignedAt);
  add('已签到', detail.signedInAt); add('故障已确认', detail.faultConfirmedAt);
  add('维修中', detail.repairStartedAt); add('待签名', detail.receiptSubmittedAt);
  add('维修完成', detail.completedAt); add('已关闭', detail.closedAt);
  if (steps.length > 0 && !detail.closedAt) {
    steps[steps.length - 1].current = true; steps[steps.length - 1].done = false;
  }
  return steps;
}

function getUser(): { id: number; name: string } | null {
  const user = getCurrentUser();
  if (!user?.id || !(user.name || user.username)) return null;
  return { id: user.id, name: user.name || user.username || '' };
}

function QuoteSection({ workOrderId, workOrderNo }: { workOrderId: number; workOrderNo: string }) {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<{ id: number; quoteNo: string; totalAmount: number; status: string }[]>([]);
  useEffect(() => { getQuotesByWorkOrder(workOrderId).then(setQuotes).catch(() => setQuotes([])); }, [workOrderId]);

  return (
    <div className="space-y-3">
      {quotes.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <FileText className="mb-2 h-8 w-8 text-[var(--muted)]" />
          <div className="text-sm text-[var(--muted)]">暂无报价单</div>
        </div>
      ) : (
        quotes.map((q) => (
          <div key={q.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-secondary)] cursor-pointer" onClick={() => navigate(`/quotes/${q.id}`)}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-secondary)]">
                <FileText className="h-4 w-4 text-[var(--muted)]" />
              </div>
              <div>
                <div className="text-sm font-medium">{q.quoteNo}</div>
                <div className="text-xs text-[var(--muted)]">&yen;{q.totalAmount.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Chip color={QUOTE_STATUS_COLORS[q.status as keyof typeof QUOTE_STATUS_COLORS]} size="sm">
                {QUOTE_STATUS_LABELS[q.status as keyof typeof QUOTE_STATUS_LABELS]}
              </Chip>
              <Button variant="ghost" size="sm" isIconOnly onPress={() => navigate(`/quotes/${q.id}`)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}
      <Button variant="secondary" size="sm" onPress={() => navigate(`/quotes/create?workOrderId=${workOrderId}&workOrderNo=${encodeURIComponent(workOrderNo)}`)} className="w-full">
        + 新建报价
      </Button>
    </div>
  );
}

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<WorkOrderDetailType | null>(null);
  const [history, setHistory] = useState<WorkOrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [acceptFormOpen, setAcceptFormOpen] = useState(false);
  const [dispatchFormOpen, setDispatchFormOpen] = useState(false);
  const [faultConfirmFormOpen, setFaultConfirmFormOpen] = useState(false);
  const [receiptFormOpen, setReceiptFormOpen] = useState(false);
  const [followUpFormOpen, setFollowUpFormOpen] = useState(false);
  const [closeOrderFormOpen, setCloseOrderFormOpen] = useState(false);
  const [cancelOrderFormOpen, setCancelOrderFormOpen] = useState(false);
  const [followUpCompleteFormOpen, setFollowUpCompleteFormOpen] = useState(false);
  const [followUpExceptionFormOpen, setFollowUpExceptionFormOpen] = useState(false);
  const [chiefHandleFormOpen, setChiefHandleFormOpen] = useState(false);
  const [escalationId, setEscalationId] = useState(0);

  const numId = id ? Number(id) : 0;
  const currentUser = getCurrentUser();

  const fetchDetail = useCallback(async () => {
    if (!numId) return;
    setLoading(true); setError('');
    try {
      const d = await getWorkOrderById(numId);
      if (d) setDetail(d); else setError('工单不存在');
      getWorkOrderHistory(numId).then(setHistory).catch(() => setHistory([]));
    } catch (e) {
      setError('加载失败');
    } finally { setLoading(false); }
  }, [numId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  async function runAction(fn: () => Promise<unknown>) {
    setActionLoading(true);
    try { await fn(); await fetchDetail(); }
    catch (err: any) { toast.danger(err?.message || '操作失败'); }
    finally { setActionLoading(false); }
  }

  if (loading) return <LoadingView text="加载工单详情..." />;
  if (error || !detail) return <ErrorView error={error || '工单不存在'} onRetry={fetchDetail} />;

  const timeline = buildTimeline(detail);
  const stateLabel = WORK_ORDER_STATE_LABELS[detail.state as keyof typeof WORK_ORDER_STATE_LABELS] || detail.state;
  const isHeld = detail.holdStatus === 'HELD';
  const warrantyChip = getWarrantyChip(detail);
  const faultPhotos = parsePhotoList(detail.faultPhotos);

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* ═══ Hero Strip ═══ */}
      <div className="flex items-center gap-5">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`flex items-center gap-3 rounded-2xl border-2 px-5 py-3 ${isHeld ? 'border-[var(--warning)] bg-[var(--warning)]/5' : 'border-[var(--warning)] bg-[var(--warning)]/5'}`}>
            <div className="w-10 h-10 rounded-full border-3 flex items-center justify-center text-lg border-[var(--warning)]">🔧</div>
            <div className="min-w-0">
              <div className="font-mono text-sm font-bold text-[var(--fg)]">{detail.orderNo}</div>
              <div className="text-xs text-[var(--muted)] truncate max-w-[240px]">{detail.officialTitle || detail.title}</div>
              {detail.customerTitleSnapshot && detail.customerTitleSnapshot !== (detail.officialTitle || detail.title) && (
                <div className="text-[10px] text-[var(--muted)]/60 truncate max-w-[240px]">客户原报：{detail.customerTitleSnapshot}</div>
              )}
            </div>
            <Chip color={STATE_CHIP_COLORS[detail.state] || 'default'} variant="primary" size="sm" className="ml-2">{stateLabel}</Chip>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Chip color={detail.priority === 'URGENT' ? 'danger' : detail.priority === 'CRITICAL' ? 'danger' : 'default'} variant="primary" size="sm">
              {WORK_ORDER_PRIORITY_LABELS[detail.priority as keyof typeof WORK_ORDER_PRIORITY_LABELS]}
            </Chip>
            <Chip color={warrantyChip.color} variant="primary" size="sm">{warrantyChip.label}</Chip>
            <Chip color="default" variant="primary" size="sm">{detail.outletName}</Chip>
            <span className="text-[11px] text-[var(--muted)]">{detail.source} · {new Date(detail.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </div>

      {/* ═══ Accept Remark Banner ═══ */}
      {detail.acceptRemark && (
        <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">受理备注</div>
          <div className="text-sm text-[var(--foreground)]">{detail.acceptRemark}</div>
        </div>
      )}

      {/* ═══ Flow Strip ═══ */}
      <Card>
        <div className="px-5 py-2 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">流程进度</span>
        </div>
        <CompactStepper timeline={timeline} />
      </Card>

      {/* ═══ Info Strip — 3 equal cards ═══ */}
      <div className="grid grid-cols-3 gap-4">
        {/* Customer */}
        <Card>
          <Card.Header className="px-5 pt-4 pb-0">
            <Card.Title className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">客户信息</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-4 pt-3 space-y-2">
            <div className="flex gap-2 text-sm"><span className="text-[var(--muted)] w-8 shrink-0">姓名</span><span className="text-[var(--fg)] font-medium">{detail.customerNameSnapshot}</span></div>
            <div className="flex gap-2 text-sm"><span className="text-[var(--muted)] w-8 shrink-0">电话</span><span className="text-[var(--fg)] font-medium">{detail.customerPhoneSnapshot}</span></div>
            <div className="flex gap-2 text-sm"><span className="text-[var(--muted)] w-8 shrink-0">地址</span><span className="text-[var(--fg)] font-medium text-xs">{detail.serviceAddressSnapshot}</span></div>
          </Card.Content>
        </Card>
        {/* Device */}
        <Card>
          <Card.Header className="px-5 pt-4 pb-0">
            <Card.Title className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">设备信息</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-4 pt-3 space-y-2">
            <div className="flex gap-2 text-sm"><span className="text-[var(--muted)] w-8 shrink-0">型号</span><span className="text-[var(--fg)] font-medium">{detail.machineModelSnapshot || '—'}</span></div>
            <div className="flex gap-2 text-sm"><span className="text-[var(--muted)] w-8 shrink-0">编号</span><span className="text-[var(--fg)] font-medium">{detail.machineSerialSnapshot || '—'}</span></div>
            <div className="flex gap-2 text-sm"><span className="text-[var(--muted)] w-8 shrink-0">三包</span><span className="text-[var(--fg)] font-medium">{warrantyChip.label}</span></div>
            <div className="flex gap-2 text-sm"><span className="text-[var(--muted)] w-8 shrink-0">到期</span><span className="text-[var(--fg)] font-medium">{formatDate(detail.warrantyEndSnapshot || detail.warrantyExpiry)}</span></div>
            {detail.warrantyPolicySnapshot && <div className="flex gap-2 text-sm"><span className="text-[var(--muted)] w-8 shrink-0">政策</span><span className="text-[var(--fg)] font-medium text-xs">{detail.warrantyPolicySnapshot}</span></div>}
            <div className="flex gap-2 text-sm"><span className="text-[var(--muted)] w-8 shrink-0">故障</span><span className="text-[var(--fg)] font-medium text-xs">{detail.faultDesc || detail.description || '—'}</span></div>
          </Card.Content>
        </Card>
        {/* Block / Warning */}
        <Card className={isHeld ? 'border-[var(--warning)]/40 bg-[var(--warning)]/3' : ''}>
          <Card.Header className="px-5 pt-4 pb-0">
            <Card.Title className={`text-xs font-semibold uppercase tracking-wider ${isHeld ? 'text-[var(--warning)]' : 'text-[var(--muted)]'}`}>
              {isHeld ? '挂起信息' : '当前节点'}
            </Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-4 pt-3">
            {isHeld ? (
              <div className="space-y-2">
                <p className="text-sm text-[var(--fg2)]">{detail.holdReason || '已挂起'}</p>
                <div className="flex gap-2">
                  {(detail.holdReason || '').startsWith('升级申请') && currentUser?.role === 'chief_engineer' ? (
                    <Button variant="primary" size="sm" isDisabled={actionLoading} onPress={async () => {
                      setActionLoading(true);
                      try {
                        const res = await getEscalations({ workOrderId: detail.id });
                        const pending = (res.list || []).find((e: any) => e.status === 'PENDING_CHIEF' || e.status === 'ACCEPTED');
                        if (pending) { setEscalationId(pending.id); setChiefHandleFormOpen(true); }
                        else toast.warning('未找到待处理的升级单');
                      } catch { toast.danger('加载升级单失败'); }
                      finally { setActionLoading(false); }
                    }} className="flex-1">
                      <Wrench className="h-4 w-4" />总工处理
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" isDisabled={actionLoading} onPress={() => runAction(() => unholdWorkOrder(detail.id))} className="flex-1">
                      <RotateCcw className="h-4 w-4" />解除挂起
                    </Button>
                  )}
                  {(detail.holdReason || '').startsWith('申请取消') && (
                    <Button variant="danger" size="sm" isDisabled={actionLoading} onPress={() => runAction(() => confirmCancelWorkOrder(detail.id))} className="flex-1">
                      <Ban className="h-4 w-4" />确认取消
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[var(--accent)]">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-semibold">{stateLabel}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-[var(--muted)]">处理人</span>
                  <span className="text-[var(--fg)] font-medium">{getHandlerLabel(detail.state, detail.engineerName || undefined, detail.outletName)}</span>
                </div>
                {detail.engineerName && (
                  <div className="flex gap-2 text-xs"><span className="text-[var(--muted)]">工程师</span><span className="text-[var(--fg)] font-medium">{detail.engineerName}</span></div>
                )}
                {detail.stateEnteredAt && (
                  <div className="flex gap-2 text-xs"><span className="text-[var(--muted)]">进入时间</span><span className="text-[var(--fg)]">{new Date(detail.stateEnteredAt).toLocaleString('zh-CN')}</span></div>
                )}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {faultPhotos.length > 0 && (
        <Card>
          <Card.Header className="px-5 pt-4 pb-0">
            <Card.Title className="text-sm font-semibold">故障图片</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-4 pt-3">
            <div className="flex flex-wrap gap-3">
              {faultPhotos.map((photo, index) => (
                <a
                  key={`${photo.slice(0, 24)}-${index}`}
                  href={photo}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-28 w-28 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                >
                  <img src={photo} alt={`故障图片 ${index + 1}`} className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* ═══ Panel Strip — Actions | Quotes | Parts ═══ */}
      <div className="grid grid-cols-3 gap-4">
        {/* Actions */}
        <Card>
          <Card.Header className="px-5 pt-4 pb-0">
            <Card.Title className="text-sm font-semibold">快捷操作</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-4 pt-3">
            <StateActions
              detail={detail} loading={actionLoading} onAction={runAction}
              onAccept={() => setAcceptFormOpen(true)}
              onAssign={() => setAssignModalOpen(true)}
              onEscalate={() => setEscalateModalOpen(true)}
              onDispatch={() => setDispatchFormOpen(true)}
              onFaultConfirm={() => setFaultConfirmFormOpen(true)}
              onReceipt={() => setReceiptFormOpen(true)}
              onFollowUpComplete={() => setFollowUpCompleteFormOpen(true)}
              onReassignOutlet={() => setDispatchFormOpen(true)}
              onReassignEngineer={() => setAssignModalOpen(true)}
            />
          </Card.Content>
        </Card>
        {/* Quotes */}
        <Card>
          <Card.Header className="px-5 pt-4 pb-0">
            <Card.Title className="text-sm font-semibold">关联报价</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-4 pt-3">
            <QuoteSection workOrderId={detail.id} workOrderNo={detail.orderNo || ''} />
          </Card.Content>
        </Card>
        {/* Parts */}
        <Card>
          <Card.Header className="px-5 pt-4 pb-0">
            <Card.Title className="text-sm font-semibold">领料工单</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-4 pt-3">
            <PartsRequestSection workOrderId={detail.id} />
          </Card.Content>
        </Card>
      </div>

      {/* ═══ History — horizontal timeline ═══ */}
      <Card>
        <Card.Header className="px-5 pt-4 pb-0">
          <Card.Title className="text-sm font-semibold">操作历史</Card.Title>
        </Card.Header>
        <Card.Content className="px-5 pb-4 pt-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-[var(--muted)] text-xs"><Clock className="mb-1.5 h-6 w-6" /><span>暂无操作记录</span></div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[...history].reverse().map((item) => (
                <div key={item.id} className={`flex-shrink-0 pl-3 border-l-2 min-w-[140px] ${item.action === detail.state ? 'border-l-[var(--warning)]' : 'border-l-[var(--border)]'}`}>
                  <div className={`text-[11px] text-[var(--muted)]`}>
                    {new Date(item.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={`text-xs font-semibold mt-0.5 ${item.action === detail.state ? 'text-[var(--warning)]' : 'text-[var(--fg)]'}`}>
                    {item.action === 'HELD' ? '已挂起' : item.action === 'UNHELD' ? '已解挂' : WORK_ORDER_STATE_LABELS[item.action as keyof typeof WORK_ORDER_STATE_LABELS] || item.action}
                  </div>
                  <div className="text-[10px] text-[var(--muted)] mt-0.5">
                    {item.operatorName || ''}
                    {(() => { if (item.action !== 'ENGINEER_ASSIGNED') return ''; const p = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload; return p?.assignedEngineerName ? ` → ${p.assignedEngineerName}` : ''; })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Assign Modal */}
      <AssignModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssign={async (engineer: User) => {
          await runAction(() => assignWorkOrder(numId, engineer.id, engineer.name));
          setAssignModalOpen(false);
        }}
        workOrderInfo={{ orderNo: detail.orderNo, title: (detail.officialTitle || detail.title), faultType: (detail.officialTitle || detail.title) }}
        outletId={detail.outletId}
      />

      {/* Escalation Modal — HeroUI */}
      <Modal>
        <Modal.Backdrop isOpen={escalateModalOpen} onOpenChange={(open) => { if (!open) { setEscalateModalOpen(false); setEscalateReason(''); } }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon><AlertTriangle className="h-5 w-5 text-[var(--warning)]" /></Modal.Icon>
                <Modal.Heading>申请升级</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="space-y-3 rounded-xl bg-[var(--surface-secondary)] p-4 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--muted)]">工单编号</span><span className="font-medium">{detail.orderNo}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted)]">工单标题</span><span className="font-medium">{detail.officialTitle || detail.title}</span></div>
                </div>
                <textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="请详细描述需要升级的原因..."
                  rows={4}
                  className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 resize-none"
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button
                  variant="primary"
                  size="sm"
                  isDisabled={!(escalateReason || '').trim() || actionLoading}
                  onPress={async () => {
                    const reason = (escalateReason || '').trim();
                    if (!reason) return;
                    const user = getUser();
                    if (!user) { toast.danger('无法获取当前用户信息'); return; }
                    await runAction(() => createEscalation({
                      workOrderId: detail.id, workOrderNo: detail.orderNo,
                      reason, applicantId: user.id, applicantName: user.name,
                    }));
                    setEscalateModalOpen(false); setEscalateReason('');
                  }}
                >
                  {actionLoading && <Spinner size="sm" className="mr-1" />}
                  提交申请
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Form Modals */}
      <ReceiptForm open={receiptFormOpen} onClose={() => setReceiptFormOpen(false)}
        onSubmit={async (data) => {
          const user = getCurrentUser();
          await runAction(() => createReceipt(detail.id, {
            repairSummary: data.repairSummary,
            repairItems: data.repairItems || [],
            partsUsed: data.partsUsed || [],
            charges: data.charges || [],
            warrantyNote: data.warrantyNote,
          }, user?.id || 0));
          setReceiptFormOpen(false);
        }} />
      <AcceptForm open={acceptFormOpen} onClose={() => setAcceptFormOpen(false)}
        onSubmit={async (data) => { await runAction(() => acceptWorkOrder(detail.id, { ...data })); setAcceptFormOpen(false); }} />
      <DispatchForm open={dispatchFormOpen} onClose={() => setDispatchFormOpen(false)}
        onSubmit={async (data) => { await runAction(() => assignOutlet(detail.id, data.outletId, data)); setDispatchFormOpen(false); }} />
      <FaultConfirmForm open={faultConfirmFormOpen} onClose={() => setFaultConfirmFormOpen(false)}
        onSubmit={async (data) => { await runAction(() => confirmFault(detail.id, { ...data, faultPhotos: data.faultPhotos?.map((p: any) => p.url) })); setFaultConfirmFormOpen(false); }} />
      <FollowUpForm open={followUpFormOpen} onClose={() => setFollowUpFormOpen(false)}
        onSubmit={async () => { await runAction(() => moveToFollowUp(detail.id)); setFollowUpFormOpen(false); }} />
      <CloseOrderForm open={closeOrderFormOpen} onClose={() => setCloseOrderFormOpen(false)}
        onSubmit={async () => { await runAction(() => closeWorkOrder(detail.id)); setCloseOrderFormOpen(false); }} />
      <CancelOrderForm open={cancelOrderFormOpen} onClose={() => setCancelOrderFormOpen(false)}
        onSubmit={async (data) => {
          const reason = data.cancelNote || data.cancelReason;
          const cancellable = ['CREATED', 'ACCEPTED', 'OUTLET_ASSIGNED', 'ENGINEER_ASSIGNED'];
          if (cancellable.includes(detail.state)) {
            await runAction(() => cancelWorkOrder(detail.id, reason));
          } else {
            await runAction(() => holdWorkOrder(detail.id, `申请取消: ${reason}`));
          }
          setCancelOrderFormOpen(false);
        }} />
      <FollowUpCompleteForm open={followUpCompleteFormOpen} onClose={() => setFollowUpCompleteFormOpen(false)}
        onSubmit={async (data) => {
          await runAction(async () => {
            const fus = await getFollowUps({ workOrderId: detail.id, status: 'PENDING', pageSize: 10 });
            const list = Array.isArray(fus) ? fus : (fus.list || []);
            const followUp = list.find((item: any) => item.workOrderId === detail.id && item.status === 'PENDING');
            if (!followUp) throw new Error('未找到待处理回访记录');
            const feedback = data.needReopen && data.reopenReason
              ? `${data.feedback || ''}\n重开原因：${data.reopenReason}`.trim()
              : data.feedback;
            await completeFollowUp(followUp.id, {
              contactResult: data.contactResult,
              satisfaction: data.satisfaction,
              feedback,
              needReopen: data.needReopen,
            });
          });
          setFollowUpCompleteFormOpen(false);
        }} />
      <FollowUpExceptionForm open={followUpExceptionFormOpen} onClose={() => setFollowUpExceptionFormOpen(false)}
        onSubmit={async (data: any) => {
          await runAction(async () => {
            const fus = await getFollowUps({ workOrderId: detail.id, status: 'PENDING', pageSize: 10 });
            const list = Array.isArray(fus) ? fus : (fus.list || []);
            const followUp = list.find((item: any) => item.workOrderId === detail.id && item.status === 'PENDING');
            if (followUp) {
              await reportFollowUpException(followUp.id, { type: data.exceptionType, note: data.exceptionNote });
            } else {
              // 未找到待处理回访记录时才创建
              let specialistId = 0;
              try {
                const stored = JSON.parse(localStorage.getItem('user') || '{}');
                specialistId = stored.id;
              } catch { /* ignore parse errors */ }
              if (!specialistId) { toast.danger('无法获取当前用户信息'); return; }
              const fu = await createFollowUp(detail.id, specialistId);
              await reportFollowUpException(fu.id, { type: data.exceptionType, note: data.exceptionNote });
            }
          });
          setFollowUpExceptionFormOpen(false);
        }} />
      <ChiefHandleForm open={chiefHandleFormOpen} onClose={() => setChiefHandleFormOpen(false)}
        onSubmit={async (data) => {
          const user = getCurrentUser() || { name: '' };
          await runAction(async () => {
            const attachments = data.photos.length > 0 ? data.photos.map(p => ({ url: p.url, name: p.name, size: p.size })) : undefined;
            await resolveEscalation(escalationId, data.solution, user.name, attachments);
            if (data.handleAction === 'REASSIGN_ENGINEER' && data.engineerIds.length > 0) {
              await assignWorkOrder(detail.id, data.engineerIds[0], '');
            }
            if (data.handleAction === 'CLOSE') {
              await closeWorkOrder(detail.id);
            }
          });
          setChiefHandleFormOpen(false);
        }} />
    </div>
  );
}

function PartsRequestSection({ workOrderId }: { workOrderId: number }) {
  const navigate = useNavigate();
  const [partsReqs, setPartsReqs] = useState<any[]>([]);
  useEffect(() => {
    apiGet(`/parts-requests?workOrderId=${workOrderId}`).then((d: any) => setPartsReqs(d.list || [])).catch(() => setPartsReqs([]));
  }, [workOrderId]);

  const chipColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success' as const;
      case 'SHIPPED': return 'accent' as const;
      case 'RECEIVED': return 'success' as const;
      case 'PENDING': return 'warning' as const;
      case 'REJECTED': return 'danger' as const;
      default: return 'default' as const;
    }
  };

  const chipLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return '待审批';
      case 'APPROVED': return '已通过';
      case 'SHIPPED': return '已发货';
      case 'RECEIVED': return '已收货';
      case 'REJECTED': return '已驳回';
      default: return status;
    }
  };

  return (
    <div className="space-y-3">
      {partsReqs.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <Package className="mb-2 h-8 w-8 text-[var(--muted)]" />
          <div className="text-sm text-[var(--muted)]">暂无领料记录</div>
        </div>
      ) : (
        partsReqs.map((pr: any) => (
          <div key={pr.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-secondary)] cursor-pointer" onClick={() => navigate(`/parts-requests/${pr.id}`)}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-secondary)]">
                <Package className="h-4 w-4 text-[var(--muted)]" />
              </div>
              <div>
                <div className="text-sm font-medium">{pr.requestNo}</div>
                <div className="text-xs text-[var(--muted)]">{pr.totalQuantity || (pr.items?.length || 0)} 件</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Chip color={chipColor(pr.status)} size="sm">
                {chipLabel(pr.status)}
              </Chip>
              <Button variant="ghost" size="sm" isIconOnly onPress={() => navigate(`/parts-requests/${pr.id}`)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}
      <Button variant="secondary" size="sm" onPress={() => navigate(`/warehouse/pick?workOrderId=${workOrderId}`)} className="w-full">
        + 新建领料
      </Button>
    </div>
  );
}

function CompactStepper({ timeline }: { timeline: { state: string; time: string; done: boolean; current?: boolean }[] }) {
  const STEP_MAP: Record<string, { key: string; label: string }> = {
    '已创建': { key:'CREATED',label:'创建' }, '已受理': { key:'ACCEPTED',label:'受理' },
    '已派网点': { key:'OUTLET_ASSIGNED',label:'派网点' }, '已派工程师': { key:'ENGINEER_ASSIGNED',label:'派工程师' },
    '已签到': { key:'SIGNED_IN',label:'签到' }, '故障已确认': { key:'FAULT_CONFIRMED',label:'故障确认' },
    '维修中': { key:'REPAIRING',label:'维修中' }, '待签名': { key:'PENDING_SIGNATURE',label:'待签名' },
    '维修完成': { key:'REPAIR_COMPLETED',label:'维修完成' }, '已关闭': { key:'CLOSED',label:'已关闭' },
  };
  const steps = timeline.map(t => ({ ...t, ...(STEP_MAP[t.state] || { key: t.state, label: t.state }) }));

  return (
    <Card.Content className="px-6 py-3">
      <div className="flex items-center gap-0 overflow-x-auto">
        {steps.map((step, i) => {
          const isDone = step.done && !step.current;
          const isCurrent = step.current;
          return (
            <div key={step.key} className="flex items-center gap-0 shrink-0">
              {i > 0 && <div className={`w-6 h-0.5 ${isDone ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />}
              <div className="flex items-center gap-1.5">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${isDone ? 'bg-[var(--success)] text-white' : isCurrent ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--muted)]'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-[11px] font-semibold whitespace-nowrap ${isDone ? 'text-[var(--muted)]' : isCurrent ? 'text-[var(--accent)]' : 'text-[var(--muted)]/50'}`}>{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card.Content>
  );
}

function StateActions({
  detail, loading, onAction,
  onAccept, onAssign, onEscalate, onDispatch, onFaultConfirm,
  onReceipt,
  onFollowUpComplete,
  onReassignOutlet, onReassignEngineer,
}: {
  detail: WorkOrderDetailType; loading: boolean;
  onAction: (fn: () => Promise<unknown>) => void;
  onAccept: () => void; onAssign: () => void; onEscalate: () => void;
  onDispatch: () => void; onFaultConfirm: () => void; onReceipt: () => void;
  onFollowUpComplete: () => void;
  onReassignOutlet?: () => void; onReassignEngineer?: () => void;
}) {
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const isAdmin = user.role === 'admin';
  const isAssigned = detail.engineerId === user.id;
  const canEngineer = isAdmin || isAssigned;
  const canOutlet = isAdmin || (user.role === 'outlet_manager' && (user.outletId === detail.outletId));
  const canFollowUp = isAdmin || user.role === 'follow_up_specialist';
  const canHQ = isAdmin || user.role === 'hq_service';

  switch (detail.state) {
    case 'CREATED':
      return canHQ ? <Button variant="primary" size="sm" onPress={onAccept} className="w-full"><CheckCircle className="h-4 w-4" />受理</Button> : null;
    case 'ACCEPTED':
      return canHQ ? <Button variant="primary" size="sm" onPress={onDispatch} className="w-full"><MapPin className="h-4 w-4" />派网点</Button> : null;
    case 'OUTLET_ASSIGNED':
      return canOutlet ? <div className="flex flex-col gap-2">
        <Button variant="primary" size="sm" onPress={onAssign} className="w-full"><UserCheck className="h-4 w-4" />分配工程师</Button>
        <Button variant="ghost" size="sm" onPress={onReassignOutlet} className="w-full text-xs">↻ 重新派网点</Button>
      </div> : <div className="rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--muted)]">等待 {detail.outletName || '网点'} 经理操作</div>;
    case 'ENGINEER_ASSIGNED':
      return canEngineer ? <div className="flex flex-col gap-2">
        <Button variant="primary" size="sm" isDisabled={loading} onPress={() => onAction(() => signInWorkOrder(detail.id))} className="w-full"><CheckCircle className="h-4 w-4" />签到</Button>
        <Button variant="ghost" size="sm" onPress={onReassignEngineer} className="w-full text-xs">↻ 重新派工程师</Button>
      </div> : <div className="rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--muted)]">等待 {detail.engineerName || '指派工程师'} 签到</div>;
    case 'SIGNED_IN':
      return canEngineer ? <Button variant="primary" size="sm" onPress={onFaultConfirm} className="w-full"><Wrench className="h-4 w-4" />确认故障</Button> : <div className="rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--muted)]">等待 {detail.engineerName || '工程师'} 确认故障</div>;
    case 'FAULT_CONFIRMED':
      return canEngineer ? <Button variant="primary" size="sm" isDisabled={loading} onPress={() => onAction(() => startRepair(detail.id))} className="w-full"><Wrench className="h-4 w-4" />开始维修</Button> : <div className="rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--muted)]">等待 {detail.engineerName || '工程师'} 开始维修</div>;
    case 'REPAIRING':
      return canEngineer ? <div className="flex flex-col gap-2">
        <Button variant="primary" size="sm" onPress={onReceipt} className="w-full"><FileText className="h-4 w-4" />提交回执</Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" isDisabled={loading} onPress={() => onAction(() => holdWorkOrder(detail.id, '等待配件'))} className="flex-1"><Ban className="h-4 w-4" />挂起</Button>
          <Button variant="secondary" size="sm" isDisabled={loading} onPress={onEscalate} className="flex-1"><AlertTriangle className="h-4 w-4" />升级</Button>
        </div>
      </div> : <div className="rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--muted)]">等待 {detail.engineerName || '工程师'} 操作</div>;
    case 'PENDING_SIGNATURE':
      return <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--muted)]"><Clock className="h-4 w-4" />等待客户签字</div>;
    case 'REPAIR_COMPLETED':
      return <div className="flex items-center gap-2 rounded-xl bg-[var(--success)]/5 px-4 py-3 text-sm text-[var(--muted)]"><CheckCircle className="h-4 w-4 text-[var(--success)]" />维修已完成，自动转入回访</div>;
    case 'FOLLOW_UP_PENDING':
      return canFollowUp ? <div className="flex flex-col gap-2">
        <Button variant="primary" size="sm" onPress={onFollowUpComplete} className="w-full"><CheckCircle className="h-4 w-4" />回访确认完成</Button>
        <Button variant="secondary" size="sm" isDisabled={loading} onPress={() => onAction(() => returnToRepairWorkOrder(detail.id))} className="w-full"><RotateCcw className="h-4 w-4" />回访异常 · 退回维修</Button>
      </div> : <div className="rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--muted)]">等待回访专员处理</div>;
    case 'CLOSED':
      return <Button variant="secondary" size="sm" isDisabled={loading} onPress={() => onAction(() => reopenWorkOrder(detail.id))} className="w-full"><RotateCcw className="h-4 w-4" />重开工单</Button>;
    default:
      return null;
  }
}

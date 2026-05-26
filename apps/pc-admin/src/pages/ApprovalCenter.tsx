import { useState, useEffect, useCallback } from 'react';
import { Card, Chip, Button, Select, ListBox, Modal } from '@heroui/react';
import { CheckCircle, Check, X, AlertTriangle } from 'lucide-react';
import { LoadingView, EmptyView } from '@kinho/shared-components';
import type { ApprovalItem, ApprovalType } from '@kinho/shared-types';
import { APPROVAL_TYPE_LABELS, APPROVAL_TYPE_COLORS, APPROVAL_STATUS_LABELS, APPROVAL_STATUS_COLORS } from '@kinho/shared-types';
import { getApprovals, approveApproval, rejectApproval } from '@/services/approval';
import { approveEscalation } from '@/services/escalation';
import { getCurrentUserName } from '@/utils/current-user';

const TABS = [
  { key: 'pending', label: '待我审批' },
  { key: 'resolved', label: '我已审批' },
  { key: 'all', label: '全部' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const TYPE_OPTIONS = [
  { key: '', label: '全部类型' },
  { key: 'PARTS_REQUEST', label: APPROVAL_TYPE_LABELS.PARTS_REQUEST },
  { key: 'PARTS_RETURN', label: APPROVAL_TYPE_LABELS.PARTS_RETURN },
  { key: 'QUOTE', label: APPROVAL_TYPE_LABELS.QUOTE },
  { key: 'WORK_ORDER_ESCALATION', label: APPROVAL_TYPE_LABELS.WORK_ORDER_ESCALATION },
];

const STATUS_OPTIONS = [
  { key: '', label: '全部状态' },
  { key: 'PENDING', label: APPROVAL_STATUS_LABELS.PENDING },
  { key: 'APPROVED', label: APPROVAL_STATUS_LABELS.APPROVED },
  { key: 'REJECTED', label: APPROVAL_STATUS_LABELS.REJECTED },
];

export default function ApprovalCenter() {
  const [tab, setTab] = useState<TabKey>('pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const currentUserName = getCurrentUserName() || '未登录';

  const fetchData = useCallback(() => {
    setLoading(true);
    getApprovals({ tab, type: (typeFilter as ApprovalType) || undefined, status: statusFilter || undefined })
      .then((res) => { setItems(res.list); setTotal(res.total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [tab, typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (item: ApprovalItem) => {
    if (item.type === 'WORK_ORDER_ESCALATION') await approveEscalation(item.sourceId, currentUserName);
    await approveApproval(item.id, currentUserName);
    fetchData();
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    await rejectApproval(rejectTarget.id, currentUserName, rejectReason);
    setRejectTarget(null); setRejectReason(''); fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="rounded-xl p-2.5" style={{ backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)' }}>
          <CheckCircle className="size-6" style={{ color: 'var(--success)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">审批中心</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">处理待审批事项，查看审批历史</p>
        </div>
      </div>

      {/* Tab bar + Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <Button key={t.key} variant={tab === t.key ? 'primary' : 'ghost'} size="sm" onPress={() => setTab(t.key)}>
              {t.label}
            </Button>
          ))}
        </div>
        <Select value={typeFilter} onChange={(v) => setTypeFilter(String(v || ''))} className="w-36">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {TYPE_OPTIONS.map((o) => (
                <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select value={statusFilter} onChange={(v) => setStatusFilter(String(v || ''))} className="w-32">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {STATUS_OPTIONS.map((o) => (
                <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <span className="ml-auto text-sm text-[var(--muted)]">共 {total} 条</span>
      </div>

      {/* Card list */}
      {loading ? (
        <LoadingView skeleton skeletonRows={5} />
      ) : items.length === 0 ? (
        <EmptyView icon={CheckCircle} title="暂无审批数据" description={tab === 'pending' ? '当前没有需要您审批的事项' : '暂无审批记录'} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <Card.Content className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <Chip color={APPROVAL_TYPE_COLORS[item.type]} variant="primary" size="sm">
                    {APPROVAL_TYPE_LABELS[item.type]}
                  </Chip>
                  <span className="text-sm font-medium">{item.sourceNo}</span>
                  <span className="ml-auto">
                    <Chip color={APPROVAL_STATUS_COLORS[item.status]} variant="primary" size="sm">
                      {APPROVAL_STATUS_LABELS[item.status]}
                    </Chip>
                  </span>
                </div>
                <div className="text-sm"><span className="text-[var(--muted)]">申请人：</span>{item.applicantName}</div>
                <div className="text-sm text-[var(--muted)]">{item.summary}</div>
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>创建时间：{item.createdAt.replace('T', ' ').slice(0, 16)}</span>
                  {item.status !== 'PENDING' && item.approverName && (
                    <span>审批人：{item.approverName}{item.resolvedAt && ` · ${item.resolvedAt.replace('T', ' ').slice(0, 16)}`}</span>
                  )}
                </div>
                {item.status === 'PENDING' && (
                  <div className="flex gap-2 pt-1">
                    <Button variant="primary" size="sm" onPress={() => handleApprove(item)}>
                      <Check className="size-4" />通过
                    </Button>
                    <Button variant="danger" size="sm" onPress={() => { setRejectTarget(item); setRejectReason(''); }}>
                      <X className="size-4" />驳回
                    </Button>
                  </div>
                )}
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal — HeroUI */}
      <Modal>
        <Modal.Backdrop isOpen={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon><AlertTriangle className="h-5 w-5 text-[var(--warning)]" /></Modal.Icon>
                <Modal.Heading>驳回审批</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {rejectTarget && (
                  <p className="mb-3 text-sm text-[var(--muted)]">单号：{rejectTarget.sourceNo}</p>
                )}
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="请输入驳回原因..." rows={3} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 resize-none" />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button variant="danger" size="sm" isDisabled={!rejectReason.trim()} onPress={handleRejectConfirm}>确认驳回</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

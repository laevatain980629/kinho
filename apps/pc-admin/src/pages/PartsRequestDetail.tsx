import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, Chip, Button, Separator, Modal, Select, ListBox, TextField, Input } from '@heroui/react';
import {
  ArrowLeft, PackagePlus, CheckCircle,
  Truck, Hash, User, Calendar, Warehouse, FileText, Plus, Trash2,
  ArrowRightLeft, Package, RotateCcw, XCircle,
} from 'lucide-react';
import type { PartsRequest, PartsRequestItem } from '@kinho/shared-types';
import type { PartsApprovalForm as PartsApprovalFormData, PartsShipForm as PartsShipFormData } from '@kinho/shared-types';
import { PARTS_REQUEST_STATUS_LABELS, PARTS_REQUEST_STATUS_COLORS, PARTS_REQUEST_TYPE_LABELS } from '@kinho/shared-types';
import { getPartsRequestById, approvePartsRequest, rejectPartsRequest, shipPartsRequest, receivePartsRequest, cancelPartsRequest, resubmitPartsRequest } from '@/services/parts-request';
import { apiGet } from '@/utils/api-client';
import { toast } from '@kinho/shared-components';
import PartsApprovalForm from '@/components/forms/PartsApprovalForm';
import PartsShipForm from '@/components/forms/PartsShipForm';
import { getCurrentUser } from '@/utils/current-user';

export default function PartsRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [req, setReq] = useState<(PartsRequest & { items: PartsRequestItem[] }) | null>(null);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [resubmitFromWH, setResubmitFromWH] = useState('');
  const [resubmitToWH, setResubmitToWH] = useState('');
  const [resubmitParts, setResubmitParts] = useState<{ partId: number; partNo: string; partName: string; partModel: string; quantity: number }[]>([]);
  const [resubmitInventory, setResubmitInventory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [whList, setWhList] = useState<any[]>([]);

  const resubmitSourceWH = whList.filter((w: any) => w.type !== 'ENGINEER_WAREHOUSE').map((w: any) => ({ key: String(w.id), label: `${w.name} · ${w.type === 'HQ_WAREHOUSE' ? '中心仓' : '网点仓'}` }));
  const resubmitTargetWH = whList.filter((w: any) => w.type === 'ENGINEER_WAREHOUSE').map((w: any) => ({ key: String(w.id), label: w.name }));

  // 源仓变化时加载库存
  useEffect(() => {
    if (!resubmitFromWH) { setResubmitInventory([]); return; }
    apiGet(`/inventory/balances?warehouseId=${resubmitFromWH}`).then((r: any) => setResubmitInventory(r.list || r || [])).catch(() => setResubmitInventory([]));
  }, [resubmitFromWH]);

  const resubmitPartOptions = resubmitInventory
    .filter((inv: any) => inv.quantityAvailable > 0)
    .map((inv: any) => ({ key: String(inv.partId), label: `${inv.partName} · ${inv.partNo} · 可用${inv.quantityAvailable}`, partNo: inv.partNo, partName: inv.partName, partModel: inv.partModel, available: inv.quantityAvailable }));

  const resubmitMax = (partId: number) => {
    const inv = resubmitInventory.find((i: any) => i.partId === partId);
    return inv?.quantityAvailable ?? 0;
  };

  useEffect(() => {
    if (id) {
      getPartsRequestById(Number(id)).then(setReq);
    }
    apiGet('/warehouses/all').then((r: any) => setWhList(r)).catch(() => setWhList([]));
  }, [id]);

  const openResubmit = () => {
    if (!req) return;
    setResubmitFromWH(String(req.fromWarehouseId));
    setResubmitToWH(String(req.toWarehouseId));
    setResubmitParts(req.items.map((it: any) => ({ partId: it.partId, partNo: it.partNo, partName: it.partName, partModel: it.partModel || '', quantity: it.quantity })));
    setShowResubmitForm(true);
  };

  const addResubmitPart = () => setResubmitParts([...resubmitParts, { partId: 0, partNo: '', partName: '', partModel: '', quantity: 1 }]);
  const removeResubmitPart = (i: number) => { if (resubmitParts.length <= 1) return; setResubmitParts(resubmitParts.filter((_, j) => j !== i)); };

  const handleResubmit = async () => {
    if (!req || !resubmitFromWH || !resubmitToWH) return;
    if (!resubmitParts.every((p) => p.partId > 0 && p.quantity > 0)) return;
    setSubmitting(true);
    try {
      const updated = await resubmitPartsRequest(req.id, {
        fromWarehouseId: Number(resubmitFromWH),
        toWarehouseId: Number(resubmitToWH),
        items: resubmitParts,
      });
      setReq(updated);
      setShowResubmitForm(false);
    } catch (err: any) { toast.danger(err?.message || '重新提交失败'); }
    finally { setSubmitting(false); }
  };

  if (!req) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-[var(--muted)]">加载中...</div>
      </div>
    );
  }

  const getOperator = () => {
    const user = getCurrentUser();
    if (!user?.id || !(user.name || user.username)) return null;
    return { id: user.id, name: user.name || user.username || '' };
  };

  const handleApprovalSubmit = async (data: PartsApprovalFormData) => {
    if (data.approvalResult === 'APPROVE') {
      const op = getOperator();
      if (!op) { toast.danger('无法获取当前用户信息'); return; }
      const updated = await approvePartsRequest(req.id, op.id, op.name);
      setReq(updated as PartsRequest & { items: PartsRequestItem[] });
    } else {
      const updated = await rejectPartsRequest(req.id, data.approvalOpinion || '无理由');
      setReq(updated as PartsRequest & { items: PartsRequestItem[] });
    }
    setShowApprovalForm(false);
  };

  const handleShipSubmit = async (_data: PartsShipFormData) => {
    const updated = await shipPartsRequest(req.id);
    setReq(updated as PartsRequest & { items: PartsRequestItem[] });
    setShowShipForm(false);
  };

  const handleReceive = async () => {
    const op = getOperator();
    if (!op) { toast.danger('无法获取当前用户信息'); return; }
    const updated = await receivePartsRequest(req.id, op.id, op.name);
    setReq(updated as PartsRequest & { items: PartsRequestItem[] });
  };

  const handleCancel = async () => {
    const updated = await cancelPartsRequest(req.id);
    setReq(updated as PartsRequest & { items: PartsRequestItem[] });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          onPress={() => navigate('/parts-requests')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <PackagePlus className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">配件申请详情</h1>
            <p className="text-xs text-[var(--muted)]">{req.requestNo}</p>
          </div>
        </div>
      </div>

      {/* Overview Card */}
      <Card>
        <Card.Content className="p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="text-xl font-bold text-[var(--foreground)]">{req.requestNo}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  类型：{PARTS_REQUEST_TYPE_LABELS[req.type]}
                </span>
                <span className="text-[var(--border)]">|</span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  创建人：{req.createdByName}
                </span>
                <span className="text-[var(--border)]">|</span>
                <span className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" />
                  关联工单：{req.workOrderNo || '无'}
                </span>
              </div>
            </div>
            <Chip color={PARTS_REQUEST_STATUS_COLORS[req.status]} size="sm">
              {PARTS_REQUEST_STATUS_LABELS[req.status]}
            </Chip>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Warehouse className="h-3.5 w-3.5" />
                调出仓
              </div>
              <div className="text-sm font-medium text-[var(--foreground)]">{req.fromWarehouseName}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                调入仓
              </div>
              <div className="text-sm font-medium text-[var(--foreground)]">{req.toWarehouseName}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Calendar className="h-3.5 w-3.5" />
                创建时间
              </div>
              <div className="text-sm font-medium text-[var(--foreground)]">
                {new Date(req.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Items Table */}
      <Card>
        <Card.Header className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[var(--accent)]" />
            <Card.Title className="text-sm font-semibold">配件明细</Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                <th className="px-6 py-3 font-medium">配件名称</th>
                <th className="px-6 py-3 font-medium">型号</th>
                <th className="px-6 py-3 font-medium">需求数量</th>
                <th className="px-6 py-3 font-medium">冻结</th>
                <th className="px-6 py-3 font-medium">已发</th>
                <th className="px-6 py-3 font-medium">已收</th>
                <th className="px-6 py-3 font-medium">在途</th>
              </tr>
            </thead>
            <tbody>
              {req.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-secondary)]">
                  <td className="px-6 py-3.5 font-medium text-[var(--foreground)]">{item.partName}</td>
                  <td className="px-6 py-3.5 text-[var(--muted)]">{item.partModel}</td>
                  <td className="px-6 py-3.5 text-[var(--foreground)]">{item.quantity}</td>
                  <td className="px-6 py-3.5">
                    <span className={item.reservedQuantity > 0 ? 'text-[var(--warning)]' : 'text-[var(--muted)]'}>
                      {item.reservedQuantity}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-[var(--foreground)]">{item.shippedQuantity}</td>
                  <td className="px-6 py-3.5 text-[var(--foreground)]">{item.receivedQuantity}</td>
                  <td className="px-6 py-3.5 text-[var(--foreground)]">{Math.max(0, item.shippedQuantity - item.receivedQuantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* Summary Card */}
      <Card>
        <Card.Content className="p-6">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">总数量</span>
            <span className="text-lg font-bold text-[var(--foreground)]">{req.totalQuantity}</span>
          </div>
          {req.remark && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start gap-2 rounded-xl bg-[var(--surface-secondary)] p-4 text-sm">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                <span className="text-[var(--muted)]">{req.remark}</span>
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Status Actions */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex gap-2 flex-wrap">
            {req.status === 'PENDING' && (
              <Button variant="primary" onPress={() => setShowApprovalForm(true)}>
                <CheckCircle className="h-4 w-4" />
                审批
              </Button>
            )}
            {req.status === 'APPROVED' && (
              <>
                <Button variant="primary" onPress={() => setShowShipForm(true)}>
                  <Truck className="h-4 w-4" />
                  发货
                </Button>
                <Button variant="secondary" onPress={handleCancel}>
                  取消领料
                </Button>
              </>
            )}
            {req.status === 'SHIPPED' && (
              <Button variant="primary" onPress={handleReceive}>
                <CheckCircle className="h-4 w-4" />
                确认收货
              </Button>
            )}
            {req.status === 'REJECTED' && (
              <Button variant="primary" onPress={openResubmit}>
                <RotateCcw className="h-4 w-4" />
                编辑重新提交
              </Button>
            )}
          </div>
          {req.status === 'REJECTED' && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-4 py-2.5 text-sm">
              <XCircle className="h-4 w-4 text-[var(--danger)]" />
              <span className="text-[var(--muted)]">已驳回：{(req as any).rejectReason || '无理由'}</span>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Resubmit Modal */}
      <Modal>
        <Modal.Backdrop isOpen={showResubmitForm} onOpenChange={(open) => { if (!open) setShowResubmitForm(false); }}>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Heading>编辑领料申请</Modal.Heading></Modal.Header>
              <Modal.Body>
                <p className="text-xs text-[var(--muted)] mb-4">修改仓库和配件明细后重新提交审批</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={resubmitFromWH} onChange={(v) => setResubmitFromWH(String(v || ''))}>
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover><ListBox className="max-h-[200px]">{resubmitSourceWH.map((w) => <ListBox.Item key={w.key} id={w.key} textValue={w.label}>{w.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
                    </Select>
                    <Select value={resubmitToWH} onChange={(v) => setResubmitToWH(String(v || ''))}>
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover><ListBox className="max-h-[200px]">{resubmitTargetWH.map((w) => <ListBox.Item key={w.key} id={w.key} textValue={w.label}>{w.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[var(--muted)] font-medium">配件明细</span>
                      <Button variant="ghost" size="sm" onPress={addResubmitPart}><Plus className="size-3" />添加</Button>
                    </div>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto">
                      {resubmitParts.map((part, i) => {
                        const max = part.partId ? resubmitMax(part.partId) : 0;
                        return (
                          <div key={i} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2">
                            <div className="flex-1">
                              <Select value={String(part.partId)} onChange={(v) => {
                                const opt = resubmitPartOptions.find((o: any) => o.key === v);
                                setResubmitParts(resubmitParts.map((p, j) => j === i ? { ...p, partId: Number(v), partNo: opt?.partNo || '', partName: opt?.partName || '', partModel: opt?.partModel || '', quantity: 1 } : p));
                              }}>
                                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                                <Select.Popover><ListBox className="max-h-[200px]">{resubmitPartOptions.map((inv: any) => <ListBox.Item key={inv.key} id={inv.key} textValue={inv.label}>{inv.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
                              </Select>
                            </div>
                            <TextField value={String(part.quantity)} onChange={(v) => {
                              const qty = Math.max(1, Math.min(max || 99, Number(v) || 1));
                              setResubmitParts(resubmitParts.map((p, j) => j === i ? { ...p, quantity: qty } : p));
                            }} className="w-16">
                              <Input type="number" placeholder="数量" className="text-center" />
                            </TextField>
                            {max > 0 && <span className="text-[10px] text-[var(--muted)]">/ {max}</span>}
                            {resubmitParts.length > 1 && <Button variant="ghost" size="sm" isIconOnly onPress={() => removeResubmitPart(i)}><Trash2 className="size-3 text-[var(--danger)]" /></Button>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button variant="primary" size="sm" isDisabled={!resubmitFromWH || !resubmitToWH || !resubmitParts.every((p) => p.partId > 0 && p.quantity > 0)} onPress={handleResubmit}>
                  {submitting ? '提交中...' : '重新提交'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Parts Approval Form */}
      <PartsApprovalForm
        open={showApprovalForm}
        onClose={() => setShowApprovalForm(false)}
        onSubmit={handleApprovalSubmit}
      />

      {/* Parts Ship Form */}
      <PartsShipForm
        open={showShipForm}
        onClose={() => setShowShipForm(false)}
        onSubmit={handleShipSubmit}
      />
    </div>
  );
}

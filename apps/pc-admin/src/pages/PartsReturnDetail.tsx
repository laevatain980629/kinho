import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, Chip, Button, Separator, TextArea, Select, ListBox } from '@heroui/react';
import {
  ArrowLeft, PackageMinus, CheckCircle, XCircle,
  Hash, User, Calendar, Warehouse, FileText,
  ArrowRightLeft, ShieldCheck, Package, Clock,
} from 'lucide-react';
import type { PartsReturn, PartsReturnItem, QualityResult } from '@kinho/shared-types';
import { PARTS_RETURN_STATUS_LABELS, PARTS_RETURN_STATUS_COLORS, RETURN_REASON_LABELS, QUALITY_RESULT_LABELS, QUALITY_RESULT_COLORS } from '@kinho/shared-types';
import { getPartsReturnById, updatePartsReturnStatus, rejectPartsReturn } from '@/services/parts-return';
import ReturnConfirmForm from '@/components/forms/ReturnConfirmForm';

export default function PartsReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ret, setRet] = useState<PartsReturn | null>(null);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [qualityResults, setQualityResults] = useState<Record<number, QualityResult>>({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showConfirmForm, setShowConfirmForm] = useState(false);

  useEffect(() => {
    if (id) {
      getPartsReturnById(Number(id)).then((data) => {
        setRet(data);
        if (data) {
          const initial: Record<number, QualityResult> = {};
          data.items.forEach((item) => {
            if (item.qualityResult) initial[item.id] = item.qualityResult;
          });
          setQualityResults(initial);
        }
      });
    }
  }, [id]);

  if (!ret) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-[var(--muted)]">加载中...</div>
      </div>
    );
  }

  const totalQuantity = ret.items.reduce((sum, i) => sum + i.quantity, 0);

  const handleConfirmReceipt = async () => {
    await updatePartsReturnStatus(ret.id, 'CONFIRMED');
    setRet({ ...ret, status: 'CONFIRMED', updatedAt: new Date().toISOString() });
  };

  const handleQualityInspection = async () => {
    const updatedItems: PartsReturnItem[] = ret.items.map((item) => ({
      ...item,
      qualityResult: qualityResults[item.id] ?? item.qualityResult,
    }));
    setRet({ ...ret, status: 'RECEIVED', items: updatedItems, updatedAt: new Date().toISOString() });
    setShowQualityModal(false);
  };

  const handleReject = async () => {
    await rejectPartsReturn(ret.id, rejectReason);
    setRet({ ...ret, status: 'REJECTED', updatedAt: new Date().toISOString() });
    setShowRejectModal(false);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          onPress={() => navigate('/parts-returns')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <PackageMinus className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">退库详情</h1>
            <p className="text-xs text-[var(--muted)]">{ret.returnNo}</p>
          </div>
        </div>
      </div>

      {/* Overview Card */}
      <Card>
        <Card.Content className="p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="text-xl font-bold text-[var(--foreground)]">{ret.returnNo}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" />
                  关联工单：{ret.workOrderNo}
                </span>
                <span className="text-[var(--border)]">|</span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  创建人：{ret.createdByName}
                </span>
              </div>
            </div>
            <Chip color={PARTS_RETURN_STATUS_COLORS[ret.status]} size="sm">
              {PARTS_RETURN_STATUS_LABELS[ret.status]}
            </Chip>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <FileText className="h-3.5 w-3.5" />
                退库原因
              </div>
              <div className="text-sm font-medium text-[var(--foreground)]">{RETURN_REASON_LABELS[ret.reason]}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Package className="h-3.5 w-3.5" />
                总数量
              </div>
              <div className="text-sm font-medium text-[var(--foreground)]">{totalQuantity}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Warehouse className="h-3.5 w-3.5" />
                来源仓库
              </div>
              <div className="text-sm font-medium text-[var(--foreground)]">{ret.fromWarehouseName}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                目标仓库
              </div>
              <div className="text-sm font-medium text-[var(--foreground)]">{ret.toWarehouseName}</div>
            </div>
          </div>

          {ret.remark && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start gap-2 rounded-xl bg-[var(--surface-secondary)] p-4 text-sm">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                <span className="text-[var(--muted)]">备注：{ret.remark}</span>
              </div>
            </>
          )}

          <div className="mt-4 flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <Calendar className="h-3.5 w-3.5" />
            创建时间：{new Date(ret.createdAt).toLocaleString('zh-CN')}
          </div>
        </Card.Content>
      </Card>

      {/* Items Table */}
      <Card>
        <Card.Header className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[var(--accent)]" />
            <Card.Title className="text-sm font-semibold">退库明细</Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                <th className="px-6 py-3 font-medium">配件名称</th>
                <th className="px-6 py-3 font-medium">型号</th>
                <th className="px-6 py-3 font-medium">数量</th>
                <th className="px-6 py-3 font-medium">质检结果</th>
              </tr>
            </thead>
            <tbody>
              {ret.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-secondary)]">
                  <td className="px-6 py-3.5 font-medium text-[var(--foreground)]">{item.partName}</td>
                  <td className="px-6 py-3.5 text-[var(--muted)]">{item.partModel}</td>
                  <td className="px-6 py-3.5 text-[var(--foreground)]">{item.quantity}</td>
                  <td className="px-6 py-3.5">
                    {item.qualityResult ? (
                      <Chip color={QUALITY_RESULT_COLORS[item.qualityResult]} size="sm">
                        {QUALITY_RESULT_LABELS[item.qualityResult]}
                      </Chip>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">待检验</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* Status Actions */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex gap-2">
            {ret.status === 'PENDING' && (
              <>
                <Button variant="primary" onPress={() => setShowConfirmForm(true)}>
                  <CheckCircle className="h-4 w-4" />
                  确认收货
                </Button>
                <Button variant="secondary" onPress={() => setShowRejectModal(true)}>
                  <XCircle className="h-4 w-4" />
                  驳回
                </Button>
              </>
            )}
            {ret.status === 'CONFIRMED' && (
              <Button variant="primary" onPress={() => setShowQualityModal(true)}>
                <ShieldCheck className="h-4 w-4" />
                质量检验
              </Button>
            )}
            {!['PENDING', 'CONFIRMED'].includes(ret.status) && (
              <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--muted)]">
                <Clock className="h-4 w-4" />
                无可用操作
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Quality Inspection Modal */}
      {showQualityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
          <div className="w-[520px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              质量检验
            </h2>
            <div className="space-y-3">
              {ret.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">{item.partName}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted)]">{item.partModel} x {item.quantity}</div>
                  </div>
                  <Select
                    value={qualityResults[item.id] || ''}
                    onChange={(v) => setQualityResults({ ...qualityResults, [item.id]: v as QualityResult })}
                    className="min-w-[10rem]"
                  >
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item key="GOOD" id="GOOD" textValue="合格">合格<ListBox.ItemIndicator /></ListBox.Item>
                        <ListBox.Item key="DAMAGED" id="DAMAGED" textValue="损坏">损坏<ListBox.ItemIndicator /></ListBox.Item>
                        <ListBox.Item key="OLD_PART" id="OLD_PART" textValue="旧件">旧件<ListBox.ItemIndicator /></ListBox.Item>
                        <ListBox.Item key="NEED_INSPECTION" id="NEED_INSPECTION" textValue="待检验">待检验<ListBox.ItemIndicator /></ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onPress={() => setShowQualityModal(false)}>取消</Button>
              <Button variant="primary" onPress={handleQualityInspection}>
                <CheckCircle className="h-4 w-4" />
                确认提交
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
          <div className="w-[420px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <XCircle className="h-5 w-5 text-[var(--danger)]" />
              驳回退库
            </h2>
            <TextArea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入驳回原因"
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onPress={() => { setShowRejectModal(false); setRejectReason(''); }}>取消</Button>
              <Button variant="danger" onPress={handleReject} isDisabled={!rejectReason.trim()}>
                <XCircle className="h-4 w-4" />
                确认驳回
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Return Confirm Form */}
      <ReturnConfirmForm
        open={showConfirmForm}
        onClose={() => setShowConfirmForm(false)}
        onSubmit={async () => {
          await handleConfirmReceipt();
          setShowConfirmForm(false);
        }}
        initialParts={ret.items.map((item) => ({
          partId: item.partId,
          partName: item.partName,
          partModel: item.partModel,
          quantity: item.quantity,
          receiveResult: 'FULL' as const,
          qualityResult: 'GOOD' as const,
        }))}
      />
    </div>
  );
}

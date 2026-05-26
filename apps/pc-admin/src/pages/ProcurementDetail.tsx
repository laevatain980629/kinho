import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, Chip, Button, TextArea } from '@heroui/react';
import {
  ArrowLeft, ShoppingCart, Edit, CheckCircle, XCircle,
  Send, Truck, Package, FileText, DollarSign, Calendar,
  Building2, Hash,
} from 'lucide-react';
import type { ProcurementRequest, ProcurementStatus } from '@kinho/shared-types';
import { PROCUREMENT_STATUS_LABELS, PROCUREMENT_STATUS_COLORS } from '@kinho/shared-types';
import { getProcurementById, approveProcurement, rejectProcurement, resubmitProcurement, receiveProcurement } from '@/services/procurement';
import ProcurementReceiveForm from '@/components/forms/ProcurementReceiveForm';

export default function ProcurementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [procurement, setProcurement] = useState<ProcurementRequest | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReceiveForm, setShowReceiveForm] = useState(false);

  useEffect(() => {
    if (id) {
      getProcurementById(Number(id)).then(setProcurement);
    }
  }, [id]);

  if (!procurement) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-[var(--muted)]">加载中...</div>
      </div>
    );
  }

  const handleStatusChange = async (status: ProcurementStatus) => {
    if (status === 'APPROVED') {
      const updated = await approveProcurement(procurement.id);
      setProcurement(updated);
    } else if (status === 'REJECTED') {
      const updated = await rejectProcurement(procurement.id, rejectReason || '无理由');
      setProcurement(updated);
    } else {
      setProcurement({ ...procurement, status, updatedAt: new Date().toISOString() });
    }
  };

  const handleReject = async () => {
    const updated = await rejectProcurement(procurement.id, rejectReason || '无理由');
    setProcurement(updated);
    setShowRejectModal(false);
    setRejectReason('');
  };

  const handleSubmitQuote = async () => {
    await handleStatusChange('QUOTED');
    setShowQuoteModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          onPress={() => navigate('/procurements')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <ShoppingCart className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">采购详情</h1>
            <p className="text-xs text-[var(--muted)]">{procurement.procurementNo}</p>
          </div>
        </div>
      </div>

      {/* Overview Card */}
      <Card>
        <Card.Content className="p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="text-xl font-bold text-[var(--foreground)]">{procurement.procurementNo}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  供应商：{procurement.supplierName}
                </span>
                {procurement.quoteNo && (
                  <>
                    <span className="text-[var(--border)]">|</span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      报价单号：{procurement.quoteNo}
                    </span>
                  </>
                )}
                {procurement.workOrderNo && (
                  <>
                    <span className="text-[var(--border)]">|</span>
                    <span className="flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      工单编号：{procurement.workOrderNo}
                    </span>
                  </>
                )}
              </div>
            </div>
            <Chip color={PROCUREMENT_STATUS_COLORS[procurement.status]} size="sm">
              {PROCUREMENT_STATUS_LABELS[procurement.status]}
            </Chip>
          </div>

          <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              预估费用：¥{procurement.estimatedCost.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              创建时间：{new Date(procurement.createdAt).toLocaleString('zh-CN')}
            </span>
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
                <th className="px-6 py-3 font-medium">名称</th>
                <th className="px-6 py-3 font-medium">型号</th>
                <th className="px-6 py-3 font-medium">数量</th>
                <th className="px-6 py-3 font-medium">单价</th>
                <th className="px-6 py-3 font-medium text-right">小计</th>
              </tr>
            </thead>
            <tbody>
              {procurement.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-secondary)]">
                  <td className="px-6 py-3.5 font-medium text-[var(--foreground)]">{item.partName}</td>
                  <td className="px-6 py-3.5 text-[var(--muted)]">{item.partModel}</td>
                  <td className="px-6 py-3.5 text-[var(--muted)]">{item.quantity}</td>
                  <td className="px-6 py-3.5 text-[var(--muted)]">¥{item.unitPrice.toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-right font-medium text-[var(--foreground)]">¥{item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* Supplier Quotes */}
      {procurement.supplierQuotes.length > 0 && (
        <Card>
          <Card.Header className="px-6 pt-5 pb-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--accent)]" />
              <Card.Title className="text-sm font-semibold">供应商报价</Card.Title>
            </div>
          </Card.Header>
          <Card.Content className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                  <th className="px-6 py-3 font-medium">供应商</th>
                  <th className="px-6 py-3 font-medium">报价金额</th>
                  <th className="px-6 py-3 font-medium">交期（天）</th>
                  <th className="px-6 py-3 font-medium">报价时间</th>
                </tr>
              </thead>
              <tbody>
                {procurement.supplierQuotes.map((sq) => (
                  <tr key={sq.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-secondary)]">
                    <td className="px-6 py-3.5 font-medium text-[var(--foreground)]">{sq.supplierName}</td>
                    <td className="px-6 py-3.5 font-medium text-[var(--foreground)]">¥{sq.quotedAmount.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-[var(--muted)]">{sq.leadTimeDays}天</td>
                    <td className="px-6 py-3.5 text-[var(--muted)]">{new Date(sq.quotedAt).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      {/* Remark */}
      {procurement.remark && (
        <Card>
          <Card.Content className="p-5">
            <div className="flex items-start gap-2 rounded-xl bg-[var(--surface-secondary)] p-4 text-sm">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span className="text-[var(--muted)]">备注：{procurement.remark}</span>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Status Actions */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex gap-2">
            {procurement.status === 'DRAFT' && (
              <Button variant="primary" onPress={() => handleStatusChange('PENDING_QUOTE')}>
                <Send className="h-4 w-4" />
                提交询价
              </Button>
            )}
            {procurement.status === 'PENDING_QUOTE' && (
              <Button variant="primary" onPress={() => setShowQuoteModal(true)}>
                <DollarSign className="h-4 w-4" />
                录入供应商报价
              </Button>
            )}
            {procurement.status === 'QUOTED' && (
              <Button variant="primary" onPress={() => handleStatusChange('PENDING_APPROVAL')}>
                <Send className="h-4 w-4" />
                提交审批
              </Button>
            )}
            {procurement.status === 'PENDING_APPROVAL' && (
              <>
                <Button variant="primary" onPress={() => handleStatusChange('APPROVED')}>
                  <CheckCircle className="h-4 w-4" />
                  通过
                </Button>
                <Button variant="danger" onPress={() => setShowRejectModal(true)}>
                  <XCircle className="h-4 w-4" />
                  驳回
                </Button>
              </>
            )}
            {procurement.status === 'APPROVED' && (
              <Button variant="primary" onPress={() => handleStatusChange('ORDERED')}>
                <ShoppingCart className="h-4 w-4" />
                下单
              </Button>
            )}
            {procurement.status === 'ORDERED' && (
              <Button variant="primary" onPress={() => setShowReceiveForm(true)}>
                <Truck className="h-4 w-4" />
                记录到货
              </Button>
            )}
            {procurement.status === 'REJECTED' && (
              <Button variant="primary" onPress={async () => { await resubmitProcurement(procurement.id); navigate(`/procurements/${procurement.id}/edit`); }}>
                <Edit className="h-4 w-4" />
                重新编辑
              </Button>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Supplier Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
          <div className="w-[420px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
              <DollarSign className="h-5 w-5 text-[var(--accent)]" />
              录入供应商报价
            </h2>
            <p className="mb-4 text-sm text-[var(--muted)]">确认已收到供应商报价，将状态更新为「已询价」。</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onPress={() => setShowQuoteModal(false)}>取消</Button>
              <Button variant="primary" onPress={handleSubmitQuote}>
                <CheckCircle className="h-4 w-4" />
                确认
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
              驳回原因
            </h2>
            <TextArea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入驳回原因..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onPress={() => setShowRejectModal(false)}>取消</Button>
              <Button variant="danger" onPress={handleReject}>确认驳回</Button>
            </div>
          </div>
        </div>
      )}

      {/* Procurement Receive Form */}
      <ProcurementReceiveForm
        open={showReceiveForm}
        onClose={() => setShowReceiveForm(false)}
        onSubmit={async () => {
          await receiveProcurement(procurement.id);
          setProcurement({ ...procurement, status: 'RECEIVED', updatedAt: new Date().toISOString() });
          setShowReceiveForm(false);
        }}
        initialItems={procurement.items.map((item) => ({
          partId: item.partId,
          partName: item.partName,
          partModel: item.partModel,
          orderedQuantity: item.quantity,
          receivedQuantity: item.quantity,
        }))}
      />
    </div>
  );
}

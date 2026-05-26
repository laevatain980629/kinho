import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, Chip, Button, Separator } from '@heroui/react';
import {
  ArrowLeft, DollarSign, Edit, CheckCircle, XCircle,
  FileText, Send, Hash, User, Calendar,
} from 'lucide-react';
import type { Quote, QuoteItem } from '@kinho/shared-types';
import type { QuoteApprovalForm as QuoteApprovalFormData, CustomerConfirmForm as CustomerConfirmFormData } from '@kinho/shared-types';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@kinho/shared-types';
import { getQuoteById, approveQuote, rejectQuote, customerConfirmQuote, submitQuote, resubmitQuote, sendToCustomer, cancelQuote } from '@/services/quote';
import QuoteApprovalForm from '@/components/forms/QuoteApprovalForm';
import CustomerConfirmForm from '@/components/forms/CustomerConfirmForm';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<(Quote & { items: QuoteItem[] }) | null>(null);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showCustomerConfirmForm, setShowCustomerConfirmForm] = useState(false);

  useEffect(() => {
    if (id) {
      getQuoteById(Number(id)).then(setQuote);
    }
  }, [id]);

  if (!quote) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-[var(--muted)]">加载中...</div>
      </div>
    );
  }

  const handleSubmit = async () => {
    await submitQuote(quote.id);
    setQuote({ ...quote, status: 'PENDING_SUPERVISOR', updatedAt: new Date().toISOString() });
  };

  const handleResubmit = async () => {
    await resubmitQuote(quote.id);
    const newStatus = quote.status === 'CUSTOMER_REJECTED' ? 'PENDING_SUPERVISOR' : 'DRAFT';
    setQuote({ ...quote, status: newStatus, updatedAt: new Date().toISOString() });
  };

  const handleApprovalSubmit = async (data: QuoteApprovalFormData) => {
    if (data.approvalResult === 'APPROVE') {
      await approveQuote(quote.id);
      setQuote({ ...quote, status: 'PENDING_PROCUREMENT', updatedAt: new Date().toISOString() });
    } else {
      await rejectQuote(quote.id, data.approvalOpinion || '无理由');
      setQuote({ ...quote, status: 'REJECTED', updatedAt: new Date().toISOString() });
    }
    setShowApprovalForm(false);
  };

  const handleCustomerConfirmSubmit = async (data: CustomerConfirmFormData) => {
    if (data.confirmResult === 'CUSTOMER_CONFIRMED') {
      await customerConfirmQuote(quote.id);
      setQuote({ ...quote, status: 'CUSTOMER_CONFIRMED', updatedAt: new Date().toISOString() });
    } else {
      await rejectQuote(quote.id, data.confirmedByName || '客户拒绝');
      setQuote({ ...quote, status: 'CUSTOMER_REJECTED', updatedAt: new Date().toISOString() });
    }
    setShowCustomerConfirmForm(false);
  };

  const partsTotal = (quote.items || []).reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          onPress={() => navigate('/quotes')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <DollarSign className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">报价详情</h1>
            <p className="text-xs text-[var(--muted)]">{quote.quoteNo}</p>
          </div>
        </div>
      </div>

      {/* Overview Card */}
      <Card>
        <Card.Content className="p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="text-xl font-bold text-[var(--foreground)]">{quote.quoteNo}</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  关联工单：{quote.workOrderNo}
                </span>
                <span className="text-[var(--border)]">|</span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  创建人：{quote.createdBy}
                </span>
              </div>
            </div>
            <Chip color={QUOTE_STATUS_COLORS[quote.status]} size="sm">
              {QUOTE_STATUS_LABELS[quote.status]}
            </Chip>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
            <Calendar className="h-3.5 w-3.5" />
            创建时间：{quote.createdAt ? new Date(quote.createdAt).toLocaleString('zh-CN') : '-'}
          </div>
        </Card.Content>
      </Card>

      {/* Items Table */}
      <Card>
        <Card.Header className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-[var(--accent)]" />
            <Card.Title className="text-sm font-semibold">配件明细</Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                <th className="px-6 py-3 font-medium">名称</th>
                <th className="px-6 py-3 font-medium">单价</th>
                <th className="px-6 py-3 font-medium">数量</th>
                <th className="px-6 py-3 font-medium text-right">小计</th>
              </tr>
            </thead>
            <tbody>
              {(quote.items || []).map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-secondary)]">
                  <td className="px-6 py-3.5 font-medium text-[var(--foreground)]">{item.name}</td>
                  <td className="px-6 py-3.5 text-[var(--muted)]">¥{item.unitPrice.toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-[var(--muted)]">{item.quantity}</td>
                  <td className="px-6 py-3.5 text-right font-medium text-[var(--foreground)]">¥{item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* Summary Card */}
      <Card>
        <Card.Content className="p-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">配件合计</span>
              <span className="font-medium text-[var(--foreground)]">¥{partsTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">工时费</span>
              <span className="font-medium text-[var(--foreground)]">¥{(quote.laborCost || 0).toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span className="text-[var(--foreground)]">总金额</span>
              <span className="text-[var(--accent)]">¥{(quote.totalAmount || 0).toLocaleString()}</span>
            </div>
          </div>
          {quote.remark && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start gap-2 rounded-xl bg-[var(--surface-secondary)] p-4 text-sm">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                <span className="text-[var(--muted)]">{quote.remark}</span>
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex gap-2">
            {quote.status === 'DRAFT' && (
              <Button variant="primary" onPress={handleSubmit}>
                <Send className="h-4 w-4" />
                提交审核
              </Button>
            )}
            {(quote.status === 'REJECTED' || quote.status === 'CUSTOMER_REJECTED') && (
              <Button variant="primary" onPress={handleResubmit}>
                <Send className="h-4 w-4" />
                重新提交
              </Button>
            )}
            {quote.status === 'PENDING_SUPERVISOR' && (
              <Button variant="primary" onPress={() => setShowApprovalForm(true)}>
                <CheckCircle className="h-4 w-4" />
                审批
              </Button>
            )}
            {quote.status === 'PENDING_PROCUREMENT' && (
              <>
                <Button variant="primary" onPress={async () => { await sendToCustomer(quote.id); setQuote({ ...quote, status: 'PENDING_CUSTOMER_CONFIRM' }); }}>
                  <CheckCircle className="h-4 w-4" />
                  确认
                </Button>
                <Button variant="danger" onPress={async () => { await cancelQuote(quote.id); setQuote({ ...quote, status: 'CANCELLED' }); }}>
                  <XCircle className="h-4 w-4" />
                  驳回
                </Button>
              </>
            )}
            {quote.status === 'PENDING_CUSTOMER_CONFIRM' && (
              <Button variant="primary" onPress={() => setShowCustomerConfirmForm(true)}>
                <CheckCircle className="h-4 w-4" />
                客户确认
              </Button>
            )}
            {quote.status === 'REJECTED' && (
              <Button variant="primary" onPress={async () => { await resubmitQuote(quote.id); navigate(`/quotes/${quote.id}/edit`); }}>
                <Edit className="h-4 w-4" />
                重新编辑
              </Button>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Quote Approval Form */}
      <QuoteApprovalForm
        open={showApprovalForm}
        onClose={() => setShowApprovalForm(false)}
        onSubmit={handleApprovalSubmit}
      />

      {/* Customer Confirm Form */}
      <CustomerConfirmForm
        open={showCustomerConfirmForm}
        onClose={() => setShowCustomerConfirmForm(false)}
        onSubmit={handleCustomerConfirmSubmit}
      />
    </div>
  );
}

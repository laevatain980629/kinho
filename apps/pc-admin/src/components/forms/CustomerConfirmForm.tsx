import { useState } from 'react';
import { Button } from '@heroui/react';
import { CheckCircle, XCircle, UserCheck } from 'lucide-react';
import type { CustomerConfirmForm as CustomerConfirmFormData, Attachment } from '@kinho/shared-types';
import PhotoUpload from './shared/PhotoUpload';

const CONFIRM_METHOD_OPTIONS = [
  { value: 'PHONE', label: '电话' },
  { value: 'WECHAT', label: '微信' },
  { value: 'ONSITE', label: '现场' },
  { value: 'PAPER', label: '纸质' },
  { value: 'OTHER', label: '其他' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerConfirmFormData) => void;
}

export default function CustomerConfirmForm({ open, onClose, onSubmit }: Props) {
  const [confirmResult, setConfirmResult] = useState<'CUSTOMER_CONFIRMED' | 'CUSTOMER_REJECTED'>('CUSTOMER_CONFIRMED');
  const [confirmMethod, setConfirmMethod] = useState<'PHONE' | 'WECHAT' | 'ONSITE' | 'PAPER' | 'OTHER'>('PHONE');
  const [confirmedByName, setConfirmedByName] = useState('');
  const [confirmedAt, setConfirmedAt] = useState('');
  const [customerOpinion, setCustomerOpinion] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  if (!open) return null;

  const handleSubmit = () => {
    onSubmit({
      confirmResult,
      confirmMethod,
      confirmedByName,
      confirmedAt,
      customerOpinion,
      attachments,
    });
    setConfirmResult('CUSTOMER_CONFIRMED');
    setConfirmMethod('PHONE');
    setConfirmedByName('');
    setConfirmedAt('');
    setCustomerOpinion('');
    setAttachments([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <UserCheck className="h-5 w-5 text-[var(--accent)]" />
          客户确认
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              确认结果 <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              value={confirmResult}
              onChange={(e) => setConfirmResult(e.target.value as 'CUSTOMER_CONFIRMED' | 'CUSTOMER_REJECTED')}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            >
              <option value="CONFIRMED">确认</option>
              <option value="REJECTED">拒绝</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              确认方式 <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              value={confirmMethod}
              onChange={(e) => setConfirmMethod(e.target.value as typeof confirmMethod)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            >
              {CONFIRM_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              确认人姓名
            </label>
            <input
              type="text"
              value={confirmedByName}
              onChange={(e) => setConfirmedByName(e.target.value)}
              placeholder="请输入确认人姓名"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              确认时间
            </label>
            <input
              type="datetime-local"
              value={confirmedAt}
              onChange={(e) => setConfirmedAt(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              客户意见
            </label>
            <textarea
              value={customerOpinion}
              onChange={(e) => setCustomerOpinion(e.target.value)}
              placeholder="请输入客户意见..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              附件
            </label>
            <PhotoUpload
              value={attachments as any}
              onChange={(files) => setAttachments(files as any)}
              max={9}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          {confirmResult === 'CUSTOMER_CONFIRMED' ? (
            <Button variant="primary" onPress={handleSubmit}>
              <CheckCircle className="h-4 w-4" />
              确认
            </Button>
          ) : (
            <Button variant="danger" onPress={handleSubmit}>
              <XCircle className="h-4 w-4" />
              拒绝
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

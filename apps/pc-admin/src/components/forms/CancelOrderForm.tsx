import { useState } from 'react';
import { Button } from '@heroui/react';
import { Ban, XCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    cancelReason: 'CUSTOMER_CANCELLED' | 'DUPLICATE' | 'INVALID' | 'OTHER';
    cancelNote: string;
  }) => void;
}

const CANCEL_REASON_OPTIONS = [
  { value: 'CUSTOMER_CANCELLED', label: '客户取消' },
  { value: 'DUPLICATE', label: '重复工单' },
  { value: 'INVALID', label: '无效工单' },
  { value: 'OTHER', label: '其他' },
] as const;

export default function CancelOrderForm({ open, onClose, onSubmit }: Props) {
  const [cancelReason, setCancelReason] = useState<'CUSTOMER_CANCELLED' | 'DUPLICATE' | 'INVALID' | 'OTHER'>('CUSTOMER_CANCELLED');
  const [cancelNote, setCancelNote] = useState('');

  const handleSubmit = () => {
    onSubmit({ cancelReason, cancelNote });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[480px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Ban className="h-5 w-5 text-[var(--danger)]" />
          取消工单
        </h2>

        {/* Cancel Reason */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">取消原因</label>
          <div className="flex flex-wrap gap-2">
            {CANCEL_REASON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCancelReason(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  cancelReason === opt.value
                    ? 'border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--danger)]/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cancel Note */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">取消备注</label>
          <textarea
            value={cancelNote}
            onChange={(e) => setCancelNote(e.target.value)}
            placeholder="请输入取消备注..."
            rows={4}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button variant="danger" onPress={handleSubmit}>
            <XCircle className="h-4 w-4" />
            确认取消工单
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@heroui/react';
import { CheckCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    closeReason: 'FOLLOW_UP_DONE' | 'NO_NEED_FOLLOW_UP' | 'ADMIN_FORCE';
    closeNote: string;
    customerSatisfaction: number;
  }) => void;
}

const CLOSE_REASON_OPTIONS = [
  { value: 'FOLLOW_UP_DONE', label: '回访完成' },
  { value: 'NO_NEED_FOLLOW_UP', label: '无需回访' },
  { value: 'ADMIN_FORCE', label: '管理员强制关闭' },
] as const;

export default function CloseOrderForm({ open, onClose, onSubmit }: Props) {
  const [closeReason, setCloseReason] = useState<'FOLLOW_UP_DONE' | 'NO_NEED_FOLLOW_UP' | 'ADMIN_FORCE'>('FOLLOW_UP_DONE');
  const [closeNote, setCloseNote] = useState('');
  const [customerSatisfaction, setCustomerSatisfaction] = useState(5);

  const handleSubmit = () => {
    onSubmit({ closeReason, closeNote, customerSatisfaction });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[480px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <CheckCircle className="h-5 w-5 text-[var(--success)]" />
          关闭工单
        </h2>

        {/* Close Reason */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">关闭原因</label>
          <div className="flex flex-wrap gap-2">
            {CLOSE_REASON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCloseReason(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  closeReason === opt.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Satisfaction */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">客户满意度</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={customerSatisfaction}
              onChange={(e) => setCustomerSatisfaction(Number(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
            />
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCustomerSatisfaction(n)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                    n <= customerSatisfaction
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
            <span>非常不满意</span>
            <span>非常满意</span>
          </div>
        </div>

        {/* Close Note */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">关闭备注</label>
          <textarea
            value={closeNote}
            onChange={(e) => setCloseNote(e.target.value)}
            placeholder="请输入关闭备注..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button variant="primary" onPress={handleSubmit}>
            <CheckCircle className="h-4 w-4" />
            确认关闭
          </Button>
        </div>
      </div>
    </div>
  );
}

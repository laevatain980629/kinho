import { useState } from 'react';
import { Button } from '@heroui/react';
import { Phone, CheckCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    contactResult: 'REACHED' | 'NOT_REACHED' | 'WRONG_NUMBER';
    satisfaction: number;
    feedback: string;
    needReopen: boolean;
    reopenReason: string;
  }) => void | Promise<void>;
}

const CONTACT_RESULT_OPTIONS = [
  { value: 'REACHED', label: '已联系' },
  { value: 'NOT_REACHED', label: '未接通' },
  { value: 'WRONG_NUMBER', label: '号码错误' },
] as const;

export default function FollowUpCompleteForm({ open, onClose, onSubmit }: Props) {
  const [contactResult, setContactResult] = useState<'REACHED' | 'NOT_REACHED' | 'WRONG_NUMBER'>('REACHED');
  const [satisfaction, setSatisfaction] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [needReopen, setNeedReopen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        contactResult,
        satisfaction,
        feedback,
        needReopen,
        reopenReason: needReopen ? reopenReason : '',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[520px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Phone className="h-5 w-5 text-[var(--accent)]" />
          回访完成
        </h2>

        {/* Contact Result */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">联系结果</label>
          <div className="flex gap-2">
            {CONTACT_RESULT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setContactResult(opt.value)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  contactResult === opt.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Satisfaction */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">客户满意度</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={satisfaction}
              onChange={(e) => setSatisfaction(Number(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
            />
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSatisfaction(n)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                    n <= satisfaction
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

        {/* Feedback */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">客户反馈</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="请输入客户反馈内容..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Need Reopen Checkbox */}
        <div className="mb-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={needReopen}
              onChange={(e) => setNeedReopen(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
            />
            <span className="text-sm font-medium text-[var(--foreground)]">需要重开工单</span>
          </label>
        </div>

        {/* Reopen Reason (conditional) */}
        {needReopen && (
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">重开原因</label>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="请输入重开原因..."
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose} isDisabled={submitting}>取消</Button>
          <Button variant="primary" onPress={handleSubmit} isDisabled={submitting}>
            <CheckCircle className="h-4 w-4" />
            {submitting ? '提交中...' : '提交回访结果'}
          </Button>
        </div>
      </div>
    </div>
  );
}

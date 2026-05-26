import { useState } from 'react';
import { Button } from '@heroui/react';
import { RotateCcw } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    returnType: 'FAULT_RECHECK' | 'PART_MISMATCH' | 'QUOTE_CHANGE' | 'OTHER';
    reason: string;
    targetState: 'FAULT_CONFIRMED' | 'REPAIRING';
  }) => void;
}

const RETURN_TYPE_OPTIONS = [
  { value: 'FAULT_RECHECK', label: '故障复检' },
  { value: 'PART_MISMATCH', label: '配件不匹配' },
  { value: 'QUOTE_CHANGE', label: '报价变更' },
  { value: 'OTHER', label: '其他' },
] as const;

const TARGET_STATE_OPTIONS = [
  { value: 'FAULT_CONFIRMED', label: '故障已确认' },
  { value: 'REPAIRING', label: '维修中' },
] as const;

export default function ReturnToForm({ open, onClose, onSubmit }: Props) {
  const [returnType, setReturnType] = useState<'FAULT_RECHECK' | 'PART_MISMATCH' | 'QUOTE_CHANGE' | 'OTHER'>('FAULT_RECHECK');
  const [reason, setReason] = useState('');
  const [targetState, setTargetState] = useState<'FAULT_CONFIRMED' | 'REPAIRING'>('FAULT_CONFIRMED');

  const handleSubmit = () => {
    onSubmit({ returnType, reason, targetState });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[480px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <RotateCcw className="h-5 w-5 text-[var(--warning)]" />
          退回工单
        </h2>

        {/* Return Type */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">退回类型</label>
          <div className="flex flex-wrap gap-2">
            {RETURN_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setReturnType(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  returnType === opt.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target State */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">退回目标状态</label>
          <div className="flex gap-2">
            {TARGET_STATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTargetState(opt.value)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  targetState === opt.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">退回原因</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请详细说明退回原因..."
            rows={4}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button variant="secondary" onPress={handleSubmit} isDisabled={!reason.trim()}>
            <RotateCcw className="h-4 w-4" />
            确认退回
          </Button>
        </div>
      </div>
    </div>
  );
}

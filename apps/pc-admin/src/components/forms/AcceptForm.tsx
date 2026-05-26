import { useState } from 'react';
import { Button } from '@heroui/react';
import { CheckCircle } from 'lucide-react';

interface AcceptFormData {
  remark?: string;
  priority?: 'NORMAL' | 'URGENT' | 'CRITICAL';
  officialTitle?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AcceptFormData) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: '普通' },
  { value: 'URGENT', label: '紧急' },
  { value: 'CRITICAL', label: '重大' },
] as const;

export default function AcceptForm({ open, onClose, onSubmit }: Props) {
  const [remark, setRemark] = useState('');
  const [officialTitle, setOfficialTitle] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT' | 'CRITICAL' | ''>('');

  if (!open) return null;

  function handleSubmit() {
    onSubmit({
      remark: remark.trim() || undefined,
      priority: priority || undefined,
      officialTitle: officialTitle.trim() || undefined,
    });
    setRemark('');
    setOfficialTitle('');
    setPriority('');
  }

  function handleClose() {
    setRemark('');
    setOfficialTitle('');
    setPriority('');
    onClose();
  }

  return (
    <div data-testid="accept-form-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="flex w-[480px] flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CheckCircle className="h-5 w-5 text-[var(--accent)]" />
          受理工单
        </h2>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            正式标题
            <span className="ml-1 text-xs text-[var(--muted)]">(可选，留空则自动生成)</span>
          </label>
          <input
            data-testid="accept-form-official-title"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            placeholder="输入正式工单标题..."
            value={officialTitle}
            onChange={(e) => setOfficialTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            优先级调整
            <span className="ml-1 text-xs text-[var(--muted)]">(可选)</span>
          </label>
          <select
            data-testid="accept-form-priority"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'NORMAL' | 'URGENT' | 'CRITICAL' | '')}
          >
            <option value="">保持原优先级</option>
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            受理备注
            <span className="ml-1 text-xs text-[var(--muted)]">(可选)</span>
          </label>
          <textarea
            data-testid="accept-form-remark"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            rows={3}
            placeholder="填写受理备注..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button data-testid="accept-form-cancel" variant="secondary" onPress={handleClose}>
            取消
          </Button>
          <Button data-testid="accept-form-submit" variant="primary" onPress={handleSubmit}>
            确认受理
          </Button>
        </div>
      </div>
    </div>
  );
}

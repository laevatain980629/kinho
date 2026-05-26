import { useState } from 'react';
import { Button } from '@heroui/react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    approvalResult: 'APPROVE' | 'REJECT';
    approvalOpinion: string;
    chiefEngineerId?: number;
  }) => void;
  engineers?: { id: number; name: string }[];
}

export default function EscalationApprovalForm({ open, onClose, onSubmit, engineers = [] }: Props) {
  const [approvalResult, setApprovalResult] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [approvalOpinion, setApprovalOpinion] = useState('');
  const [chiefEngineerId, setChiefEngineerId] = useState<number | undefined>(undefined);

  const handleSubmit = () => {
    onSubmit({
      approvalResult,
      approvalOpinion,
      chiefEngineerId: approvalResult === 'APPROVE' ? chiefEngineerId : undefined,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[480px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
          升级审批
        </h2>

        {/* Approval Result */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">审批结果</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setApprovalResult('APPROVE')}
              className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                approvalResult === 'APPROVE'
                  ? 'border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]'
                  : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--success)]/30'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              通过
            </button>
            <button
              type="button"
              onClick={() => setApprovalResult('REJECT')}
              className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                approvalResult === 'REJECT'
                  ? 'border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]'
                  : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--danger)]/30'
              }`}
            >
              <XCircle className="h-4 w-4" />
              驳回
            </button>
          </div>
        </div>

        {/* Chief Engineer Select (only when approve) */}
        {approvalResult === 'APPROVE' && engineers.length > 0 && (
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">指派总工程师</label>
            <select
              value={chiefEngineerId ?? ''}
              onChange={(e) => setChiefEngineerId(Number(e.target.value) || undefined)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            >
              <option value="">请选择总工程师</option>
              {engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>{eng.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Approval Opinion */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">审批意见</label>
          <textarea
            value={approvalOpinion}
            onChange={(e) => setApprovalOpinion(e.target.value)}
            placeholder="请输入审批意见..."
            rows={4}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button
            variant={approvalResult === 'APPROVE' ? 'primary' : 'danger'}
            onPress={handleSubmit}
          >
            {approvalResult === 'APPROVE' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {approvalResult === 'APPROVE' ? '确认通过' : '确认驳回'}
          </Button>
        </div>
      </div>
    </div>
  );
}

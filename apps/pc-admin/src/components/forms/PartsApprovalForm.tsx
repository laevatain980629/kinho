import { useState } from 'react';
import { Button } from '@heroui/react';
import { CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import type { PartsApprovalForm as PartsApprovalFormData } from '@kinho/shared-types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PartsApprovalFormData) => void;
}

export default function PartsApprovalForm({ open, onClose, onSubmit }: Props) {
  const [approvalResult, setApprovalResult] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [approvalOpinion, setApprovalOpinion] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    onSubmit({ approvalResult, approvalOpinion });
    setApprovalResult('APPROVE');
    setApprovalOpinion('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[480px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
          配件审批
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              审批结果 <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              value={approvalResult}
              onChange={(e) => setApprovalResult(e.target.value as 'APPROVE' | 'REJECT')}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            >
              <option value="APPROVE">通过</option>
              <option value="REJECT">驳回</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              审批意见
            </label>
            <textarea
              value={approvalOpinion}
              onChange={(e) => setApprovalOpinion(e.target.value)}
              placeholder="请输入审批意见..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          {approvalResult === 'APPROVE' ? (
            <Button variant="primary" onPress={handleSubmit}>
              <CheckCircle className="h-4 w-4" />
              确认通过
            </Button>
          ) : (
            <Button variant="danger" onPress={handleSubmit}>
              <XCircle className="h-4 w-4" />
              确认驳回
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { PhoneForwarded, CheckCircle } from 'lucide-react';
import { getUsers } from '@/services/user';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    specialistId: number;
    followUpPlanAt: string;
    note: string;
  }) => void;
}

export default function FollowUpForm({ open, onClose, onSubmit }: Props) {
  const [specialistId, setSpecialistId] = useState<number | undefined>(undefined);
  const [followUpPlanAt, setFollowUpPlanAt] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [specialists, setSpecialists] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      getUsers({ role: 'engineer', status: 'ACTIVE', page: 1, pageSize: 50 })
        .then((res) => setSpecialists(res.list.map((u) => ({ id: u.id, name: u.name }))))
        .catch(() => setSpecialists([]));
    }
  }, [open]);

  const handleSubmit = () => {
    if (!specialistId) return;
    onSubmit({
      specialistId,
      followUpPlanAt: new Date(followUpPlanAt).toISOString(),
      note,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[480px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <PhoneForwarded className="h-5 w-5 text-[var(--accent)]" />
          安排回访
        </h2>

        {/* Specialist Select */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">回访专员</label>
          <select
            value={specialistId ?? ''}
            onChange={(e) => setSpecialistId(Number(e.target.value) || undefined)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          >
            <option value="">请选择回访专员</option>
            {specialists.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Follow-up Plan Date */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">计划回访时间</label>
          <input
            type="datetime-local"
            value={followUpPlanAt}
            onChange={(e) => setFollowUpPlanAt(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Note */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">备注</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="请输入回访备注..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button variant="primary" onPress={handleSubmit} isDisabled={!specialistId}>
            <CheckCircle className="h-4 w-4" />
            确认安排
          </Button>
        </div>
      </div>
    </div>
  );
}

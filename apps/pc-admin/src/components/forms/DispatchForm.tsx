import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { MapPin } from 'lucide-react';
import type { Outlet } from '@kinho/shared-types';
import { getAllOutlets } from '@/services/outlet';
import { DISPATCH_OUTLET, validateActionForm } from '@kinho/workflow';
import { toast } from '@kinho/shared-components';

interface DispatchFormData {
  outletId: number;
  outletName: string;
  dispatchReason?: string;
  expectedArriveAt?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: DispatchFormData) => void;
}

export default function DispatchForm({ open, onClose, onSubmit }: Props) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<number | ''>('');
  const [dispatchReason, setDispatchReason] = useState('');
  const [expectedArriveAt, setExpectedArriveAt] = useState('');

  useEffect(() => {
    if (open) {
      getAllOutlets()
        .then((data) => setOutlets(data.filter((o) => o.status === 'ACTIVE')))
        .catch(() => setOutlets([]));
      setSelectedOutletId('');
      setDispatchReason('');
      setExpectedArriveAt('');
    }
  }, [open]);

  if (!open) return null;

  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId);

  function handleSubmit() {
    const form = { outletId: Number(selectedOutletId), dispatchReason, expectedArriveAt };
    const result = validateActionForm(DISPATCH_OUTLET, form);
    if (!result.valid) { toast.danger(Object.values(result.errors).join('；')); return; }
    if (!selectedOutlet) { toast.danger('请选择有效网点'); return; }
    onSubmit({
      outletId: selectedOutletId as number,
      outletName: selectedOutlet.name,
      dispatchReason: dispatchReason.trim() || undefined,
      expectedArriveAt: expectedArriveAt || undefined,
    });
  }

  function handleClose() {
    setSelectedOutletId('');
    setDispatchReason('');
    setExpectedArriveAt('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="flex w-[480px] flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <MapPin className="h-5 w-5 text-[var(--accent)]" />
          派单网点
        </h2>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            选择网点 <span className="text-[var(--danger)]">*</span>
          </label>
          <select
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">请选择网点</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name} - {outlet.manager}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            派单原因
            <span className="ml-1 text-xs text-[var(--muted)]">(可选)</span>
          </label>
          <textarea
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            rows={3}
            placeholder="填写派单原因..."
            value={dispatchReason}
            onChange={(e) => setDispatchReason(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            预计到达时间
            <span className="ml-1 text-xs text-[var(--muted)]">(可选)</span>
          </label>
          <input
            type="datetime-local"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            value={expectedArriveAt}
            onChange={(e) => setExpectedArriveAt(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={handleClose}>
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={!selectedOutletId}
            onPress={handleSubmit}
          >
            确认派单
          </Button>
        </div>
      </div>
    </div>
  );
}

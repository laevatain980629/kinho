import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { Wrench } from 'lucide-react';
import type { FaultType } from '@kinho/shared-types';
import { getFaultTypes } from '@/services/fault-type';
import PhotoUpload from '@/components/forms/shared/PhotoUpload';
import { CONFIRM_FAULT, validateActionForm } from '@kinho/workflow';
import { toast } from '@kinho/shared-components';

interface Attachment {
  id: number;
  name: string;
  url: string;
  type: 'image' | 'file';
  size: number;
  uploadedAt: string;
}

interface FaultConfirmFormData {
  faultTypeIds: number[];
  faultTypeNames: string[];
  faultDesc: string;
  faultCause?: string;
  faultPhotos: Attachment[];
  suggestedRepairPlan?: string;
  needQuote: boolean;
  needParts: boolean;
  needProcurement: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FaultConfirmFormData) => void;
}

export default function FaultConfirmForm({ open, onClose, onSubmit }: Props) {
  const [faultTypes, setFaultTypes] = useState<FaultType[]>([]);
  const [selectedFaultTypeIds, setSelectedFaultTypeIds] = useState<number[]>([]);
  const [faultDesc, setFaultDesc] = useState('');
  const [faultCause, setFaultCause] = useState('');
  const [faultPhotos, setFaultPhotos] = useState<Attachment[]>([]);
  const [suggestedRepairPlan, setSuggestedRepairPlan] = useState('');
  const [needQuote, setNeedQuote] = useState(false);
  const [needParts, setNeedParts] = useState(false);
  const [needProcurement, setNeedProcurement] = useState(false);

  useEffect(() => {
    if (open) {
      getFaultTypes()
        .then((res) => setFaultTypes(res.list.filter((f: any) => f.status === 'ACTIVE')))
        .catch(() => setFaultTypes([]));
      setSelectedFaultTypeIds([]);
      setFaultDesc('');
      setFaultCause('');
      setFaultPhotos([]);
      setSuggestedRepairPlan('');
      setNeedQuote(false);
      setNeedParts(false);
      setNeedProcurement(false);
    }
  }, [open]);

  if (!open) return null;

  function toggleFaultType(id: number) {
    setSelectedFaultTypeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSubmit() {
    const result = validateActionForm(CONFIRM_FAULT, { faultTypeIds: selectedFaultTypeIds, faultDesc });
    if (!result.valid) {
      toast.danger(Object.values(result.errors).join('；'));
      return;
    }
    const selectedNames = faultTypes
      .filter((f) => selectedFaultTypeIds.includes(f.id))
      .map((f) => f.name);
    onSubmit({
      faultTypeIds: selectedFaultTypeIds,
      faultTypeNames: selectedNames,
      faultDesc: faultDesc.trim(),
      faultCause: faultCause.trim() || undefined,
      faultPhotos,
      suggestedRepairPlan: suggestedRepairPlan.trim() || undefined,
      needQuote,
      needParts,
      needProcurement,
    });
  }

  function handleClose() {
    setSelectedFaultTypeIds([]);
    setFaultDesc('');
    setFaultCause('');
    setFaultPhotos([]);
    setSuggestedRepairPlan('');
    setNeedQuote(false);
    setNeedParts(false);
    setNeedProcurement(false);
    onClose();
  }

  const canSubmit = faultDesc.trim().length > 0 && selectedFaultTypeIds.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="flex w-[560px] max-h-[85vh] flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Wrench className="h-5 w-5 text-[var(--accent)]" />
          故障确认
        </h2>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Fault Type Multi-Select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              故障类型 <span className="text-[var(--danger)]">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {faultTypes.map((ft) => (
                <button
                  key={ft.id}
                  type="button"
                  onClick={() => toggleFaultType(ft.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    selectedFaultTypeIds.includes(ft.id)
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  {ft.name}
                </button>
              ))}
              {faultTypes.length === 0 && (
                <span className="text-sm text-[var(--muted)]">加载中...</span>
              )}
            </div>
          </div>

          {/* Fault Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              故障描述 <span className="text-[var(--danger)]">*</span>
            </label>
            <textarea
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              rows={3}
              placeholder="请详细描述故障现象..."
              value={faultDesc}
              onChange={(e) => setFaultDesc(e.target.value)}
            />
          </div>

          {/* Fault Cause */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              故障原因
              <span className="ml-1 text-xs text-[var(--muted)]">(可选)</span>
            </label>
            <textarea
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              rows={2}
              placeholder="分析故障原因..."
              value={faultCause}
              onChange={(e) => setFaultCause(e.target.value)}
            />
          </div>

          {/* Fault Photos */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              故障照片
              <span className="ml-1 text-xs text-[var(--muted)]">(可选)</span>
            </label>
            <PhotoUpload value={faultPhotos} onChange={setFaultPhotos} max={9} />
          </div>

          {/* Suggested Repair Plan */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              建议维修方案
              <span className="ml-1 text-xs text-[var(--muted)]">(可选)</span>
            </label>
            <textarea
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              rows={2}
              placeholder="建议的维修方案..."
              value={suggestedRepairPlan}
              onChange={(e) => setSuggestedRepairPlan(e.target.value)}
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 rounded-xl bg-[var(--surface-secondary)] p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                checked={needQuote}
                onChange={(e) => setNeedQuote(e.target.checked)}
              />
              <span className="text-sm text-[var(--foreground)]">需要报价</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                checked={needParts}
                onChange={(e) => setNeedParts(e.target.checked)}
              />
              <span className="text-sm text-[var(--foreground)]">需要配件</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                checked={needProcurement}
                onChange={(e) => setNeedProcurement(e.target.checked)}
              />
              <span className="text-sm text-[var(--foreground)]">需要采购</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={handleClose}>
            取消
          </Button>
          <Button variant="primary" isDisabled={!canSubmit} onPress={handleSubmit}>
            确认故障
          </Button>
        </div>
      </div>
    </div>
  );
}

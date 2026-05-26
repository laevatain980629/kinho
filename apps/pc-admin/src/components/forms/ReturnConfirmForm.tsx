import { useState } from 'react';
import { Button } from '@heroui/react';
import {
  PackageMinus, CheckCircle, Plus, Trash2, Camera,
} from 'lucide-react';
import PhotoUpload from './shared/PhotoUpload';

// Match PhotoUpload's local Attachment type
interface Attachment {
  id: number;
  name: string;
  url: string;
  type: 'image' | 'file';
  size: number;
  uploadedAt: string;
}

interface ReceivedPart {
  partId: number;
  partName: string;
  partModel: string;
  quantity: number;
  receiveResult: 'FULL' | 'PARTIAL' | 'REJECTED';
  qualityResult: 'GOOD' | 'DAMAGED' | 'OLD_PART' | 'NEED_INSPECTION';
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    receivedParts: ReceivedPart[];
    receiveResult: 'FULL' | 'PARTIAL' | 'REJECTED';
    qualityResult: 'GOOD' | 'DAMAGED' | 'OLD_PART' | 'NEED_INSPECTION';
    receivedAt: string;
    confirmNote: string;
    photos: Attachment[];
  }) => void;
  initialParts?: ReceivedPart[];
}

const RECEIVE_RESULT_OPTIONS = [
  { value: 'FULL', label: '全部收到' },
  { value: 'PARTIAL', label: '部分收到' },
  { value: 'REJECTED', label: '拒绝接收' },
] as const;

const QUALITY_RESULT_OPTIONS = [
  { value: 'GOOD', label: '合格' },
  { value: 'DAMAGED', label: '损坏' },
  { value: 'OLD_PART', label: '旧件' },
  { value: 'NEED_INSPECTION', label: '待检验' },
] as const;

export default function ReturnConfirmForm({ open, onClose, onSubmit, initialParts = [] }: Props) {
  const [receiveResult, setReceiveResult] = useState<'FULL' | 'PARTIAL' | 'REJECTED'>('FULL');
  const [qualityResult, setQualityResult] = useState<'GOOD' | 'DAMAGED' | 'OLD_PART' | 'NEED_INSPECTION'>('GOOD');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 16));
  const [confirmNote, setConfirmNote] = useState('');
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [parts, setParts] = useState<ReceivedPart[]>(
    initialParts.length > 0
      ? initialParts
      : [{ partId: 0, partName: '', partModel: '', quantity: 1, receiveResult: 'FULL', qualityResult: 'GOOD' }],
  );

  const addPart = () => {
    setParts([...parts, { partId: 0, partName: '', partModel: '', quantity: 1, receiveResult: 'FULL', qualityResult: 'GOOD' }]);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, field: keyof ReceivedPart, value: string | number) => {
    const updated = [...parts];
    updated[index] = { ...updated[index], [field]: value };
    setParts(updated);
  };

  const handleSubmit = () => {
    onSubmit({
      receivedParts: parts,
      receiveResult,
      qualityResult,
      receivedAt: new Date(receivedAt).toISOString(),
      confirmNote,
      photos,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="flex max-h-[85vh] w-[640px] flex-col gap-4 overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <PackageMinus className="h-5 w-5 text-[var(--accent)]" />
          退库确认收货
        </h2>

        {/* Received Parts List */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--foreground)]">收货明细</label>
            <Button variant="ghost" size="sm" onPress={addPart}>
              <Plus className="h-4 w-4" />
              添加配件
            </Button>
          </div>
          <div className="space-y-3">
            {parts.map((part, index) => (
              <div
                key={index}
                className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    value={part.partName}
                    onChange={(e) => updatePart(index, 'partName', e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="配件名称"
                  />
                  <input
                    value={part.partModel}
                    onChange={(e) => updatePart(index, 'partModel', e.target.value)}
                    className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="型号"
                  />
                  <input
                    type="number"
                    min={0}
                    value={part.quantity}
                    onChange={(e) => updatePart(index, 'quantity', Number(e.target.value))}
                    className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="数量"
                  />
                  <button
                    type="button"
                    onClick={() => removePart(index)}
                    className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted)]">收货:</span>
                    <select
                      value={part.receiveResult}
                      onChange={(e) => updatePart(index, 'receiveResult', e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs focus:border-[var(--accent)] focus:outline-none"
                    >
                      {RECEIVE_RESULT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted)]">质检:</span>
                    <select
                      value={part.qualityResult}
                      onChange={(e) => updatePart(index, 'qualityResult', e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs focus:border-[var(--accent)] focus:outline-none"
                    >
                      {QUALITY_RESULT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Receive Result */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">收货结果</label>
            <div className="flex gap-2">
              {RECEIVE_RESULT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReceiveResult(opt.value)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    receiveResult === opt.value
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">整体质量结果</label>
            <div className="flex flex-wrap gap-2">
              {QUALITY_RESULT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setQualityResult(opt.value)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    qualityResult === opt.value
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Received At */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">收货时间</label>
          <input
            type="datetime-local"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Note */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">确认备注</label>
          <textarea
            value={confirmNote}
            onChange={(e) => setConfirmNote(e.target.value)}
            placeholder="请输入收货确认备注..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Photos */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
            <Camera className="h-4 w-4" />
            照片凭证
          </label>
          <PhotoUpload value={photos} onChange={setPhotos} />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button variant="primary" onPress={handleSubmit}>
            <CheckCircle className="h-4 w-4" />
            确认收货
          </Button>
        </div>
      </div>
    </div>
  );
}

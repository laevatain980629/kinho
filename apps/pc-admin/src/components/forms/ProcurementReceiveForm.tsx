import { useState } from 'react';
import { Button } from '@heroui/react';
import {
  Truck, CheckCircle, Plus, Trash2, Camera,
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

interface ReceivedItem {
  partId: number;
  partName: string;
  partModel: string;
  orderedQuantity: number;
  receivedQuantity: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    receivedItems: ReceivedItem[];
    receivedAt: string;
    qualityCheckResult: 'PASS' | 'FAIL' | 'PARTIAL';
    qualityNote: string;
    photos: Attachment[];
  }) => void;
  initialItems?: ReceivedItem[];
}

const QUALITY_CHECK_OPTIONS = [
  { value: 'PASS', label: '合格' },
  { value: 'FAIL', label: '不合格' },
  { value: 'PARTIAL', label: '部分合格' },
] as const;

export default function ProcurementReceiveForm({ open, onClose, onSubmit, initialItems = [] }: Props) {
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 16));
  const [qualityCheckResult, setQualityCheckResult] = useState<'PASS' | 'FAIL' | 'PARTIAL'>('PASS');
  const [qualityNote, setQualityNote] = useState('');
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [items, setItems] = useState<ReceivedItem[]>(
    initialItems.length > 0
      ? initialItems
      : [{ partId: 0, partName: '', partModel: '', orderedQuantity: 0, receivedQuantity: 0 }],
  );

  const addItem = () => {
    setItems([...items, { partId: 0, partName: '', partModel: '', orderedQuantity: 0, receivedQuantity: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ReceivedItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = () => {
    onSubmit({
      receivedItems: items,
      receivedAt: new Date(receivedAt).toISOString(),
      qualityCheckResult,
      qualityNote,
      photos,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="flex max-h-[85vh] w-[600px] flex-col gap-4 overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Truck className="h-5 w-5 text-[var(--accent)]" />
          采购到货验收
        </h2>

        {/* Received Items List */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--foreground)]">到货明细</label>
            <Button variant="ghost" size="sm" onPress={addItem}>
              <Plus className="h-4 w-4" />
              添加配件
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3"
              >
                <input
                  value={item.partName}
                  onChange={(e) => updateItem(index, 'partName', e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="配件名称"
                />
                <input
                  value={item.partModel}
                  onChange={(e) => updateItem(index, 'partModel', e.target.value)}
                  className="w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="型号"
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--muted)]">订单:</span>
                  <input
                    type="number"
                    min={0}
                    value={item.orderedQuantity}
                    onChange={(e) => updateItem(index, 'orderedQuantity', Number(e.target.value))}
                    className="w-16 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                    placeholder="订单"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--muted)]">实收:</span>
                  <input
                    type="number"
                    min={0}
                    value={item.receivedQuantity}
                    onChange={(e) => updateItem(index, 'receivedQuantity', Number(e.target.value))}
                    className="w-16 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                    placeholder="实收"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Check Result */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">质检结果</label>
          <div className="flex gap-2">
            {QUALITY_CHECK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setQualityCheckResult(opt.value)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  qualityCheckResult === opt.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Received At */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">到货时间</label>
          <input
            type="datetime-local"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Quality Note */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">质检备注</label>
          <textarea
            value={qualityNote}
            onChange={(e) => setQualityNote(e.target.value)}
            placeholder="请输入质检备注..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Photos */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
            <Camera className="h-4 w-4" />
            到货照片
          </label>
          <PhotoUpload value={photos} onChange={setPhotos} />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button variant="primary" onPress={handleSubmit}>
            <CheckCircle className="h-4 w-4" />
            确认到货
          </Button>
        </div>
      </div>
    </div>
  );
}

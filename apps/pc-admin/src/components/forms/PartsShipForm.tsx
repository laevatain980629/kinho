import { useState } from 'react';
import { Button } from '@heroui/react';
import { Truck, Plus, Trash2 } from 'lucide-react';
import type { PartsShipForm as PartsShipFormData, ShipPartItem } from '@kinho/shared-types';

const SHIP_METHOD_OPTIONS = [
  { value: 'SELF_PICKUP', label: '自提' },
  { value: 'DELIVERY', label: '配送' },
  { value: 'EXPRESS', label: '快递' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PartsShipFormData) => void;
}

export default function PartsShipForm({ open, onClose, onSubmit }: Props) {
  const [shipParts, setShipParts] = useState<ShipPartItem[]>([{ partName: '', quantity: 1 }]);
  const [shipMethod, setShipMethod] = useState<'SELF_PICKUP' | 'DELIVERY' | 'EXPRESS'>('DELIVERY');
  const [trackingNo, setTrackingNo] = useState('');
  const [shippedAt, setShippedAt] = useState('');

  if (!open) return null;

  const handleAddPart = () => {
    setShipParts([...shipParts, { partName: '', quantity: 1 }]);
  };

  const handleRemovePart = (index: number) => {
    setShipParts(shipParts.filter((_, i) => i !== index));
  };

  const handlePartChange = (index: number, field: keyof ShipPartItem, value: string | number) => {
    const updated = shipParts.map((part, i) =>
      i === index ? { ...part, [field]: value } : part,
    );
    setShipParts(updated);
  };

  const handleSubmit = () => {
    const validParts = shipParts.filter((p) => p.partName.trim() && p.quantity > 0);
    if (validParts.length === 0) return;
    onSubmit({
      shipParts: validParts,
      shipMethod,
      trackingNo,
      shippedAt,
    });
    setShipParts([{ partName: '', quantity: 1 }]);
    setShipMethod('DELIVERY');
    setTrackingNo('');
    setShippedAt('');
  };

  const canSubmit = shipParts.some((p) => p.partName.trim() && p.quantity > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Truck className="h-5 w-5 text-[var(--accent)]" />
          配件发货
        </h2>

        <div className="space-y-4">
          {/* Ship Parts List */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              发运配件 <span className="text-[var(--danger)]">*</span>
            </label>
            <div className="space-y-2">
              {shipParts.map((part, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={part.partName}
                    onChange={(e) => handlePartChange(index, 'partName', e.target.value)}
                    placeholder="配件名称"
                    className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                  <input
                    type="number"
                    value={part.quantity}
                    onChange={(e) => handlePartChange(index, 'quantity', Math.max(1, Number(e.target.value)))}
                    min={1}
                    className="w-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                  {shipParts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      onPress={() => handleRemovePart(index)}
                    >
                      <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onPress={handleAddPart}
            >
              <Plus className="h-4 w-4" />
              添加配件
            </Button>
          </div>

          {/* Ship Method */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              发货方式 <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              value={shipMethod}
              onChange={(e) => setShipMethod(e.target.value as typeof shipMethod)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            >
              {SHIP_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Tracking No */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              物流单号
            </label>
            <input
              type="text"
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              placeholder="请输入物流单号"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>

          {/* Shipped At */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              发货时间
            </label>
            <input
              type="datetime-local"
              value={shippedAt}
              onChange={(e) => setShippedAt(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>取消</Button>
          <Button variant="primary" onPress={handleSubmit} isDisabled={!canSubmit}>
            <Truck className="h-4 w-4" />
            确认发货
          </Button>
        </div>
      </div>
    </div>
  );
}

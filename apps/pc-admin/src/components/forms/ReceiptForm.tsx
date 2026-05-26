import { useState } from 'react';
import { Button } from '@heroui/react';
import { Plus, Trash2, Wrench, Package, DollarSign, Camera, X } from 'lucide-react';
import type { ReceiptForm as ReceiptFormData, ReceiptItem, PartItem, ChargeItem } from '@kinho/shared-types';
import { CHARGE_TYPE_OPTIONS } from '@kinho/shared-types';
import { SUBMIT_RECEIPT, validateActionForm } from '@kinho/workflow';
import { toast } from '@kinho/shared-components';
import PhotoUpload from './shared/PhotoUpload';

interface AttachmentUI {
  id: number;
  name: string;
  url: string;
  type: 'image' | 'file';
  size: number;
  uploadedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ReceiptFormData) => void;
}

export default function ReceiptForm({ open, onClose, onSubmit }: Props) {
  const [repairSummary, setRepairSummary] = useState('');
  const [warrantyNote, setWarrantyNote] = useState('');

  const [repairItems, setRepairItems] = useState<RepairItemUI[]>([
    { name: '', description: '', laborHours: 0 },
  ]);
  const [partItems, setPartItems] = useState<PartItemUI[]>([
    { partId: 0, partName: '', quantity: 1 },
  ]);
  const [chargeItems, setChargeItems] = useState<ChargeItemUI[]>([
    { chargeType: 'LABOR', name: '', quantity: 1, unitPrice: 0, amount: 0 },
  ]);
  const [afterRepairPhotos, setAfterRepairPhotos] = useState<AttachmentUI[]>([]);

  // --- Repair items ---
  function addRepairItem() {
    setRepairItems([...repairItems, { name: '', description: '', laborHours: 0 }]);
  }
  function removeRepairItem(index: number) {
    setRepairItems(repairItems.filter((_, i) => i !== index));
  }
  function updateRepairItem(index: number, field: keyof RepairItemUI, value: string | number) {
    setRepairItems(repairItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  // --- Part items ---
  function addPartItem() {
    setPartItems([...partItems, { partId: 0, partName: '', quantity: 1 }]);
  }
  function removePartItem(index: number) {
    setPartItems(partItems.filter((_, i) => i !== index));
  }
  function updatePartItem(index: number, field: keyof PartItemUI, value: string | number) {
    setPartItems(partItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  // --- Charge items ---
  function addChargeItem() {
    setChargeItems([...chargeItems, { chargeType: 'LABOR', name: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  }
  function removeChargeItem(index: number) {
    setChargeItems(chargeItems.filter((_, i) => i !== index));
  }
  function updateChargeItem(index: number, field: keyof ChargeItemUI, value: string | number) {
    setChargeItems(
      chargeItems.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // Auto-calc amount when quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          updated.amount = Number(updated.quantity) * Number(updated.unitPrice);
        }
        return updated;
      }),
    );
  }

  const totalAmount = chargeItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  function handleSubmit() {
    const form = { repairSummary, repairItems, partsUsed: partItems, charges: chargeItems };
    const result = validateActionForm(SUBMIT_RECEIPT, form);
    if (!result.valid) { toast.danger(Object.values(result.errors).join('；')); return; }
    const data: ReceiptFormData = {
      workOrderId: 0, // caller fills in
      repairSummary,
      repairItems: repairItems.map<ReceiptItem>((r) => ({
        name: r.name,
        description: r.description || undefined,
        laborHours: r.laborHours || undefined,
      })),
      partsUsed: partItems.map<PartItem>((p) => ({
        partId: p.partId,
        partName: p.partName,
        partModel: p.partModel || undefined,
        quantity: p.quantity,
      })),
      charges: chargeItems.map<ChargeItem>((c) => ({
        chargeType: c.chargeType,
        name: c.name || c.chargeType,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        amount: c.amount,
      })),
      afterRepairPhotos: afterRepairPhotos.map((p) => ({
        url: p.url,
        name: p.name,
        size: p.size,
      })),
      warrantyNote: warrantyNote.trim() || undefined,
    };
    onSubmit(data);
  }

  const inputCls =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20';
  const textareaCls = inputCls + ' resize-none';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
      <div className="flex max-h-[90vh] w-[900px] flex-col rounded-2xl bg-[var(--surface)] shadow-[var(--overlay-shadow)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <Wrench className="h-5 w-5 text-[var(--accent)]" />
            提交维修回执
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-secondary)]">
            <X className="h-5 w-5 text-[var(--muted)]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Repair summary */}
          <Section icon={<Wrench className="h-4 w-4" />} title="维修摘要 *">
            <textarea
              className={textareaCls}
              rows={3}
              placeholder="请描述维修情况..."
              value={repairSummary}
              onChange={(e) => setRepairSummary(e.target.value)}
            />
          </Section>

          {/* Repair items */}
          <Section
            icon={<Wrench className="h-4 w-4" />}
            title="维修项目"
            action={
              <Button type="button" variant="ghost" size="sm" onPress={addRepairItem}>
                <Plus className="h-3.5 w-3.5" />
                添加
              </Button>
            }
          >
            <div className="space-y-3">
              {repairItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="grid flex-1 grid-cols-3 gap-2">
                    <input
                      className={inputCls}
                      placeholder="项目名称"
                      value={item.name}
                      onChange={(e) => updateRepairItem(i, 'name', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      placeholder="维修描述"
                      value={item.description}
                      onChange={(e) => updateRepairItem(i, 'description', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="工时(h)"
                      value={item.laborHours || ''}
                      onChange={(e) => updateRepairItem(i, 'laborHours', Number(e.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRepairItem(i)}
                    className="mt-2 rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* Part items */}
          <Section
            icon={<Package className="h-4 w-4" />}
            title="使用配件"
            action={
              <Button type="button" variant="ghost" size="sm" onPress={addPartItem}>
                <Plus className="h-3.5 w-3.5" />
                添加
              </Button>
            }
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                  <th className="pb-2 pr-2 font-medium">配件名称 *</th>
                  <th className="pb-2 pr-2 font-medium">型号</th>
                  <th className="w-24 pb-2 pr-2 font-medium">数量</th>
                  <th className="w-10 pb-2" />
                </tr>
              </thead>
              <tbody>
                {partItems.map((item, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-2">
                      <input
                        className={inputCls}
                        placeholder="配件名称"
                        value={item.partName}
                        onChange={(e) => updatePartItem(i, 'partName', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className={inputCls}
                        placeholder="型号（可选）"
                        value={item.partModel || ''}
                        onChange={(e) => updatePartItem(i, 'partModel', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className={inputCls}
                        type="number"
                        min={1}
                        value={item.quantity || ''}
                        onChange={(e) => updatePartItem(i, 'quantity', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removePartItem(i)}
                        className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Charge items */}
          <Section
            icon={<DollarSign className="h-4 w-4" />}
            title="收费项目"
            action={
              <Button type="button" variant="ghost" size="sm" onPress={addChargeItem}>
                <Plus className="h-3.5 w-3.5" />
                添加
              </Button>
            }
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                  <th className="pb-2 pr-2 font-medium">费类</th>
                  <th className="pb-2 pr-2 font-medium">名称</th>
                  <th className="w-20 pb-2 pr-2 font-medium">数量</th>
                  <th className="w-24 pb-2 pr-2 font-medium">单价</th>
                  <th className="w-24 pb-2 pr-2 font-medium">金额</th>
                  <th className="w-10 pb-2" />
                </tr>
              </thead>
              <tbody>
                {chargeItems.map((item, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-2">
                      <select
                        className={inputCls}
                        value={item.chargeType}
                        onChange={(e) => updateChargeItem(i, 'chargeType', e.target.value)}
                      >
                        {CHARGE_TYPE_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className={inputCls}
                        placeholder="名称"
                        value={item.name}
                        onChange={(e) => updateChargeItem(i, 'name', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className={inputCls}
                        type="number"
                        min={1}
                        value={item.quantity || ''}
                        onChange={(e) => updateChargeItem(i, 'quantity', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className={inputCls}
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice || ''}
                        onChange={(e) => updateChargeItem(i, 'unitPrice', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className={inputCls + ' bg-[var(--surface-secondary)]'}>
                        {item.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeChargeItem(i)}
                        className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div className="mt-3 flex justify-end">
              <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-secondary)] px-4 py-2">
                <span className="text-sm text-[var(--muted)]">合计金额</span>
                <span className="text-lg font-bold text-[var(--foreground)]">
                  ¥{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </Section>

          {/* Photos */}
          <Section icon={<Camera className="h-4 w-4" />} title="维修后照片">
            <PhotoUpload value={afterRepairPhotos} onChange={setAfterRepairPhotos} max={9} />
          </Section>

          {/* Warranty note */}
          <Section title="保修说明（可选）">
            <textarea
              className={textareaCls}
              rows={2}
              placeholder="保修期限、保修范围等..."
              value={warrantyNote}
              onChange={(e) => setWarrantyNote(e.target.value)}
            />
          </Section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <Button variant="secondary" onPress={onClose}>
            取消
          </Button>
          <Button variant="primary" onPress={handleSubmit} isDisabled={!repairSummary.trim()}>
            提交回执
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Internal extended UI types ─── */

interface RepairItemUI {
  name: string;
  description: string;
  laborHours: number;
}

interface PartItemUI {
  partId: number;
  partName: string;
  partModel?: string;
  quantity: number;
}

interface ChargeItemUI {
  chargeType: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

/* ─── Section helper ─── */

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

import { useState, useCallback, useMemo } from 'react';
import type { ReceiptForm } from '@kinho/shared-types';
import { CHARGE_TYPE_OPTIONS } from '@kinho/shared-types';

interface RepairRow { id: number; name: string; description: string; laborHours: number; }
interface PartRow { id: number; partName: string; partModel?: string; quantity: number; }
interface ChargeRow { id: number; chargeType: string; name: string; quantity: number; unitPrice: number; amount: number; }

export { CHARGE_TYPE_OPTIONS };

export function useReceiptForm(workOrderId: number) {
  const [summary, setSummary] = useState('');
  const [warrantyNote, setWarrantyNote] = useState('');
  const [repairItems, setRepairItems] = useState<RepairRow[]>([{ id: 1, name: '更换液压泵密封圈', description: '', laborHours: 0 }]);
  const [partItems, setPartItems] = useState<PartRow[]>([{ id: 1, partName: '液压泵密封圈', partModel: '', quantity: 2 }]);
  const [chargeItems, setChargeItems] = useState<ChargeRow[]>([{ id: 1, chargeType: 'LABOR', name: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  // Repair items
  const addRepair = () => setRepairItems([...repairItems, { id: Date.now(), name: '', description: '', laborHours: 0 }]);
  const removeRepair = (id: number) => setRepairItems(repairItems.filter((i) => i.id !== id));
  const updateRepair = (id: number, field: keyof RepairRow, value: string | number) =>
    setRepairItems(repairItems.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  // Part items
  const addPart = () => setPartItems([...partItems, { id: Date.now(), partName: '', partModel: '', quantity: 1 }]);
  const removePart = (id: number) => setPartItems(partItems.filter((i) => i.id !== id));
  const updatePart = (id: number, field: keyof PartRow, value: string | number) =>
    setPartItems(partItems.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  // Charge items
  const addCharge = () => setChargeItems([...chargeItems, { id: Date.now(), chargeType: 'LABOR', name: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  const removeCharge = (id: number) => setChargeItems(chargeItems.filter((i) => i.id !== id));
  const updateCharge = (id: number, field: keyof ChargeRow, value: string | number) =>
    setChargeItems(chargeItems.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') updated.amount = Number(updated.quantity) * Number(updated.unitPrice);
      return updated;
    }));

  const totalAmount = useMemo(
    () => chargeItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [chargeItems]
  );

  const isValid = summary.trim().length >= 10;

  const buildPayload = useCallback((): ReceiptForm => ({
    workOrderId,
    repairItems: repairItems.map((r) => ({ name: r.name, status: r.description })),
    partsUsed: partItems.map((p) => ({ partId: 0, partName: p.partName, partModel: p.partModel, quantity: p.quantity })),
    charges: chargeItems.map((c) => ({ name: c.name, amount: c.amount })),
    summary,
    photos: [],
  }), [workOrderId, repairItems, partItems, chargeItems, summary]);

  return {
    summary, setSummary,
    warrantyNote, setWarrantyNote,
    repairItems, addRepair, removeRepair, updateRepair,
    partItems, addPart, removePart, updatePart,
    chargeItems, addCharge, removeCharge, updateCharge,
    totalAmount,
    submitting, setSubmitting,
    isValid,
    buildPayload,
  };
}

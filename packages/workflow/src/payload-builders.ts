// ── helpers ──

function trim(s: unknown): string | undefined {
  return typeof s === 'string' && s.trim() ? s.trim() : undefined;
}

function toNum(s: unknown): number | undefined {
  const n = Number(s);
  return Number.isNaN(n) ? undefined : n;
}

function toBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

// ── Builders ──

export function buildAcceptPayload(form: Record<string, unknown>, _ctx: { workOrderId: number }) {
  return {
    priority: trim(form.priority),
    remark: trim(form.remark),
    officialTitle: trim(form.officialTitle),
  };
}

export function buildDispatchOutletPayload(form: Record<string, unknown>, _ctx: { workOrderId: number }) {
  return {
    outletId: toNum(form.outletId)!,
    dispatchReason: trim(form.dispatchReason),
    expectedArriveAt: trim(form.expectedArriveAt),
  };
}

export function buildAssignEngineerPayload(form: Record<string, unknown>, _ctx: { workOrderId: number }) {
  return { engineerId: toNum(form.engineerId)! };
}

export function buildConfirmFaultPayload(form: Record<string, unknown>, _ctx: { workOrderId: number }) {
  return {
    faultTypeIds: Array.isArray(form.faultTypeIds) ? form.faultTypeIds.map(Number).filter(n => n > 0) : [],
    faultDesc: trim(form.faultDesc) || '',
    faultCause: trim(form.faultCause),
    faultPhotos: Array.isArray(form.faultPhotos) ? form.faultPhotos.filter(Boolean) : undefined,
    suggestedRepairPlan: trim(form.suggestedRepairPlan),
    needQuote: toBool(form.needQuote),
    needParts: toBool(form.needParts),
    needProcurement: toBool(form.needProcurement),
  };
}

export function buildSubmitReceiptPayload(form: Record<string, unknown>, ctx: { workOrderId: number }) {
  const charges = Array.isArray(form.charges) ? form.charges as Array<{ amount: number }> : [];
  const totalAmount = charges.length > 0 ? charges.reduce((sum, c) => sum + (c.amount || 0), 0) : 0;

  return {
    workOrderId: ctx.workOrderId,
    repairSummary: trim(form.repairSummary) || '',
    repairItems: Array.isArray(form.repairItems) && form.repairItems.length > 0 ? JSON.stringify(form.repairItems) : undefined,
    partItems: Array.isArray(form.partsUsed) && form.partsUsed.length > 0 ? JSON.stringify(form.partsUsed) : undefined,
    chargeItems: charges.length > 0 ? JSON.stringify(charges) : undefined,
    totalAmount: totalAmount > 0 ? totalAmount : undefined,
  };
}

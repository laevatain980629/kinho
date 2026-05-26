import { useState, useCallback, useMemo } from 'react';
import type { FaultConfirmForm } from '@kinho/shared-types';

const FAULT_TYPES = [
  '液压系统', '发动机', '电气系统', '行走机构',
  '回转机构', '空调系统', '驾驶室', '工作装置',
];

export function useFaultTypes() {
  return FAULT_TYPES;
}

export function useFaultConfirmForm(workOrderId: number) {
  const [selected, setSelected] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [faultCause, setFaultCause] = useState('');
  const [suggestedPlan, setSuggestedPlan] = useState('');
  const [needQuote, setNeedQuote] = useState(false);
  const [needParts, setNeedParts] = useState(false);
  const [needProcurement, setNeedProcurement] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggle = useCallback((type: string) => {
    setSelected((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (selected.length === 0) e.types = '至少选择一个故障分类';
    if (description.length < 10) e.description = '故障描述至少 10 个字';
    return e;
  }, [selected, description]);

  const isValid = Object.keys(errors).length === 0;

  const buildPayload = useCallback((): FaultConfirmForm => ({
    workOrderId,
    faultTypeIds: [],
    faultTypeNames: selected,
    description,
    photos: [],
    needsQuote: needQuote,
    needsParts: needParts,
    needsProcurement: needProcurement,
  }), [workOrderId, selected, description, needQuote, needParts, needProcurement]);

  return {
    selected, setSelected, toggle,
    description, setDescription,
    faultCause, setFaultCause,
    suggestedPlan, setSuggestedPlan,
    needQuote, setNeedQuote,
    needParts, setNeedParts,
    needProcurement, setNeedProcurement,
    submitting, setSubmitting,
    errors, isValid,
    buildPayload,
  };
}

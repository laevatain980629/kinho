import { useEffect, useMemo, useState } from 'react';
import { apiPost } from '@/utils/api-client';
import { getAvailableWorkOrderActions, validateActionForm, type WorkOrderActionSchema } from '@kinho/workflow';
import type { CurrentUser, PermissionResponse } from '@/services/auth';
import { getFaultTypes, getOutletEngineers, getOutlets, type FaultTypeOption, type EngineerOption, type OutletOption } from '@/services/options';

type FormState = Record<string, unknown>;

interface Props {
  workOrderId: number;
  state: string;
  role: string;
  permissions: PermissionResponse['permissions'];
  currentUser: CurrentUser | null;
  outletId?: number | null;
  isAssignedEngineer: boolean;
  isOutletManagerForOrder: boolean;
  onDone: () => Promise<void> | void;
}

function initForm(action: WorkOrderActionSchema): FormState {
  const form: FormState = {};
  for (const field of action.fields) {
    if (field.type === 'boolean') form[field.name] = false;
    else if (field.type === 'multi-select') form[field.name] = [];
    else form[field.name] = '';
  }
  return form;
}

function parseListText(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  const trimmed = value.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return trimmed
      .split(/[\n,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function normalizeForm(action: WorkOrderActionSchema, form: FormState) {
  const normalized: Record<string, unknown> = { ...form };
  for (const field of action.fields) {
    const value = normalized[field.name];

    if (field.type === 'select' || field.type === 'outlet-select' || field.type === 'engineer-select') {
      normalized[field.name] = value === '' || value === undefined ? value : Number(value);
    }

    if (field.type === 'boolean') {
      normalized[field.name] = Boolean(value);
    }

    if (field.type === 'multi-select') {
      normalized[field.name] = Array.isArray(value)
        ? value.map((item) => Number(item)).filter((item) => !Number.isNaN(item))
        : parseListText(value).map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }

    if (field.type === 'repair-item-list' || field.type === 'part-list' || field.type === 'charge-list' || field.type === 'photo-upload') {
      normalized[field.name] = parseListText(value);
    }

    if (field.type === 'datetime' && typeof value === 'string' && value) {
      normalized[field.name] = value;
    }
  }
  return normalized;
}

function getFieldValue(form: FormState, name: string) {
  return form[name];
}

export default function WorkflowActionPanel(props: Props) {
  const { state, role, permissions, currentUser, outletId, isAssignedEngineer, isOutletManagerForOrder, onDone, workOrderId } = props;
  const actions = useMemo(
    () => getAvailableWorkOrderActions({
      state,
      permissions,
      role,
      isAssignedEngineer,
      isOutletManagerForOrder,
    }),
    [state, permissions, role, isAssignedEngineer, isOutletManagerForOrder],
  );

  const [selectedAction, setSelectedAction] = useState<WorkOrderActionSchema | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [engineers, setEngineers] = useState<EngineerOption[]>([]);
  const [faultTypes, setFaultTypes] = useState<FaultTypeOption[]>([]);

  useEffect(() => {
    if (!selectedAction) return;
    setForm(initForm(selectedAction));
    setError('');

    if (selectedAction.key === 'DISPATCH_OUTLET') {
      getOutlets().then(setOutlets).catch(() => setOutlets([]));
    }
    if (selectedAction.key === 'ASSIGN_ENGINEER' && outletId) {
      getOutletEngineers(outletId).then(setEngineers).catch(() => setEngineers([]));
    }
    if (selectedAction.key === 'CONFIRM_FAULT') {
      getFaultTypes().then(setFaultTypes).catch(() => setFaultTypes([]));
    }
  }, [selectedAction, outletId]);

  const close = () => {
    setSelectedAction(null);
    setError('');
    setSubmitting(false);
  };

  const submit = async () => {
    if (!selectedAction) return;
    const normalized = normalizeForm(selectedAction, form);
    const result = validateActionForm(selectedAction, normalized);
    if (!result.valid) {
      setError(Object.values(result.errors)[0] || '表单校验失败');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = selectedAction.buildPayload(normalized, { workOrderId });
      await apiPost(selectedAction.api.replace(':id', String(workOrderId)), payload);
      await onDone();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const available = actions.length > 0 ? actions : [];

  if (!available.length) return null;

  return (
    <section className="mweb-card">
      <div className="mweb-section-head">
        <h3>可用操作</h3>
      </div>
      <div className="mweb-action-row">
        {available.map((action) => (
          <button key={action.key} className="mweb-primary" type="button" onClick={() => setSelectedAction(action)}>
            {action.label}
          </button>
        ))}
      </div>

      {selectedAction ? (
        <div className="mweb-modal-backdrop">
          <div className="mweb-modal">
            <div className="mweb-section-head">
              <h3>{selectedAction.label}</h3>
              <button className="mweb-icon-btn" onClick={close}>×</button>
            </div>
            <div className="mweb-form">
              {selectedAction.fields.map((field) => {
                const value = getFieldValue(form, field.name);
                if (field.type === 'boolean') {
                  return (
                    <label key={field.name} className="mweb-check">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.checked }))}
                      />
                      <span>{field.label}</span>
                    </label>
                  );
                }

                if (field.type === 'select' || field.type === 'outlet-select' || field.type === 'engineer-select') {
                  let options: Array<{ value: string | number | boolean; label: string }> = field.options || [];
                  if (field.optionsSource === 'outlets') {
                    options = outlets.map((item) => ({ value: item.id, label: `${item.name}${item.code ? ` · ${item.code}` : ''}` }));
                  }
                  if (field.optionsSource === 'engineers') {
                    options = engineers.map((item) => ({ value: item.id, label: `${item.name}${item.phone ? ` · ${item.phone}` : ''}` }));
                  }
                  return (
                    <label key={field.name}>
                      {field.label}
                      <select value={String(value ?? '')} onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}>
                        <option value="">{field.placeholder || '请选择'}</option>
                        {options.map((option) => (
                          <option key={String(option.value)} value={String(option.value)}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (field.type === 'multi-select') {
                  const options = field.optionsSource === 'faultTypes'
                    ? faultTypes.map((item) => ({ value: item.id, label: item.name }))
                    : field.options || [];
                  return (
                    <div key={field.name} className="mweb-field-group">
                      <div className="mweb-field-label">{field.label}</div>
                      <div className="mweb-checkbox-grid">
                        {options.map((option) => {
                          const checked = Array.isArray(value) && value.map(String).includes(String(option.value));
                          return (
                            <label key={String(option.value)} className="mweb-check">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setForm((prev) => {
                                    const current = Array.isArray(prev[field.name]) ? [...prev[field.name] as unknown[]] : [];
                                    const next = String(option.value);
                                    const exists = current.map(String).includes(next);
                                    const result = exists
                                      ? current.filter((item) => String(item) !== next)
                                      : [...current, option.value];
                                    return { ...prev, [field.name]: result };
                                  });
                                }}
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return (
                  <label key={field.name}>
                    {field.label}
                    <textarea
                      placeholder={field.placeholder || ''}
                      value={typeof value === 'string' ? value : Array.isArray(value) ? JSON.stringify(value) : ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                      rows={field.type === 'textarea' ? 4 : 3}
                    />
                  </label>
                );
              })}
              {error ? <div className="mweb-error">{error}</div> : null}
              <div className="mweb-modal-actions">
                <button className="mweb-secondary" type="button" onClick={close}>取消</button>
                <button className="mweb-primary" type="button" onClick={submit} disabled={submitting}>
                  {submitting ? '提交中...' : '提交'}
                </button>
              </div>
              {currentUser ? <div className="mweb-muted">当前用户：{currentUser.name || currentUser.username}</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

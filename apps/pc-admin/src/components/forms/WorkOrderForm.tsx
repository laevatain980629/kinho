import { useEffect, useMemo, useState } from 'react';
import { Button } from '@heroui/react';
import type { CreateWorkOrderForm, Customer, Machine } from '@kinho/shared-types';
import { getAllCustomers } from '@/services/customer';
import { getMachines } from '@/services/machine';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWorkOrderForm) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: '普通' },
  { value: 'URGENT', label: '紧急' },
  { value: 'CRITICAL', label: '非常紧急' },
] as const;

const SOURCE_OPTIONS = [
  { value: 'PHONE', label: '电话' },
  { value: 'PC', label: 'PC端' },
  { value: 'OTHER', label: '其他' },
] as const;

const INPUT_CLASS =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

const EMPTY_FORM: CreateWorkOrderForm = {
  title: '',
  description: '',
  customerId: undefined,
  machineId: undefined,
  customerName: '',
  customerPhone: '',
  serviceAddress: '',
  machineSerial: '',
  machineModel: '',
  priority: 'NORMAL',
  source: 'PC',
};

export default function WorkOrderForm({ open, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<CreateWorkOrderForm>(EMPTY_FORM);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setMachines([]);
    setLoadingCustomers(true);
    getAllCustomers()
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, [open]);

  useEffect(() => {
    if (!open || !form.customerId) return;
    setLoadingMachines(true);
    getMachines({ customerId: form.customerId, status: 'ACTIVE', page: 1, pageSize: 200 })
      .then((res) => setMachines(res.list))
      .catch(() => setMachines([]))
      .finally(() => setLoadingMachines(false));
  }, [open, form.customerId]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customerId),
    [customers, form.customerId],
  );

  if (!open) return null;

  function updateField<K extends keyof CreateWorkOrderForm>(
    key: K,
    value: CreateWorkOrderForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCustomerChange(value: string) {
    const customerId = value ? Number(value) : undefined;
    const customer = customers.find((item) => item.id === customerId);
    setMachines([]);
    setForm((prev) => ({
      ...prev,
      customerId,
      machineId: undefined,
      customerName: customer?.companyName || '',
      customerPhone: customer?.phone || '',
      serviceAddress: customer?.address || '',
      machineSerial: '',
      machineModel: '',
    }));
  }

  function handleMachineChange(value: string) {
    const machineId = value ? Number(value) : undefined;
    const machine = machines.find((item) => item.id === machineId);
    setForm((prev) => ({
      ...prev,
      machineId,
      machineSerial: machine?.serialNo || '',
      machineModel: machine?.model || '',
    }));
  }

  function handleSubmit() {
    const cost = estimatedCost.trim() ? Number(estimatedCost) : undefined;
    onSubmit({ ...form, estimatedCost: cost !== undefined && !Number.isNaN(cost) ? cost : undefined });
  }

  const isValid =
    form.title.trim() &&
    form.description.trim() &&
    form.customerId &&
    form.machineId &&
    form.customerName.trim() &&
    form.customerPhone.trim() &&
    form.serviceAddress.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div data-testid="work-order-form" className="flex w-[640px] max-h-[85vh] flex-col gap-4 rounded-xl bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="text-base font-semibold">新建工单</h2>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              工单标题 <span className="text-red-500">*</span>
            </label>
            <input
              data-testid="work-order-title"
              className={INPUT_CLASS}
              placeholder="请输入工单标题"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                客户 <span className="text-red-500">*</span>
              </label>
              <select
                data-testid="work-order-customer"
                className={INPUT_CLASS}
                value={form.customerId ? String(form.customerId) : ''}
                onChange={(event) => handleCustomerChange(event.target.value)}
              >
                <option value="">{loadingCustomers ? '客户加载中...' : '请选择客户'}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                设备 <span className="text-red-500">*</span>
              </label>
              <select
                data-testid="work-order-machine"
                className={INPUT_CLASS}
                value={form.machineId ? String(form.machineId) : ''}
                onChange={(event) => handleMachineChange(event.target.value)}
                disabled={!form.customerId}
              >
                <option value="">
                  {!form.customerId ? '请先选择客户' : loadingMachines ? '设备加载中...' : '请选择设备'}
                </option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.serialNo} / {machine.model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">联系人</label>
              <input data-testid="work-order-customer-name" className={INPUT_CLASS} value={form.customerName} readOnly />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">联系电话</label>
              <input data-testid="work-order-customer-phone" className={INPUT_CLASS} value={form.customerPhone} readOnly />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              服务地址 <span className="text-red-500">*</span>
            </label>
            <input
              data-testid="work-order-service-address"
              className={INPUT_CLASS}
              placeholder="默认使用客户地址，可按本次服务地址调整"
              value={form.serviceAddress}
              onChange={(event) => updateField('serviceAddress', event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">设备型号</label>
              <input data-testid="work-order-machine-model" className={INPUT_CLASS} value={form.machineModel ?? ''} readOnly />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">设备编号</label>
              <input data-testid="work-order-machine-serial" className={INPUT_CLASS} value={form.machineSerial ?? ''} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                优先级 <span className="text-red-500">*</span>
              </label>
              <select
                data-testid="work-order-priority"
                className={INPUT_CLASS}
                value={form.priority}
                onChange={(event) =>
                  updateField('priority', event.target.value as CreateWorkOrderForm['priority'])
                }
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                来源 <span className="text-red-500">*</span>
              </label>
              <select
                data-testid="work-order-source"
                className={INPUT_CLASS}
                value={form.source}
                onChange={(event) =>
                  updateField('source', event.target.value as CreateWorkOrderForm['source'])
                }
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              故障描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              data-testid="work-order-description"
              className={`${INPUT_CLASS} min-h-[90px] resize-y`}
              placeholder="请描述故障现象、发生时间和现场情况"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              预估费用
              <span className="ml-1 text-xs text-[var(--muted)]">(可选)</span>
            </label>
            <input
              data-testid="work-order-estimated-cost"
              className={INPUT_CLASS}
              type="number"
              min={0}
              step={0.01}
              placeholder="预估维修费用（元）"
              value={estimatedCost}
              onChange={(event) => setEstimatedCost(event.target.value)}
            />
          </div>

          {selectedCustomer && machines.length === 0 && !loadingMachines && (
            <div className="rounded-lg bg-[var(--warning)]/10 px-3 py-2 text-xs text-[var(--warning)]">
              当前客户没有可选设备，请先在机台管理中新增设备后再创建工单。
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button data-testid="work-order-cancel" variant="secondary" onPress={onClose}>
            取消
          </Button>
          <Button data-testid="work-order-submit" variant="primary" onPress={handleSubmit} isDisabled={!isValid}>
            提交
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Card, Chip, Button, SearchField } from '@heroui/react';
import { Inbox, UserCheck, UserPlus, Wrench, Clock } from 'lucide-react';
import { toast } from '@kinho/shared-components';
import { EmptyView, LoadingView } from '@kinho/shared-components';
import type { WorkOrderListItem, User } from '@kinho/shared-types';
import { WORK_ORDER_PRIORITY_LABELS } from '@kinho/shared-types';
import { getWorkOrders, acceptWorkOrder, assignWorkOrder } from '@/services/work-order';
import { getCustomerRequests, acceptCustomerRequest, rejectCustomerRequest, type CustomerRequestItem } from '@/services/customer-request';
import { getAllCustomers } from '@/services/customer';
import { getMachines } from '@/services/machine';
import AssignModal from '@/components/AssignModal';
import AcceptForm from '@/components/forms/AcceptForm';

const POOL_STATES = ['CREATED', 'ACCEPTED', 'OUTLET_ASSIGNED'] as const;

const SOURCE_LABELS: Record<string, string> = {
  CUSTOMER_H5: 'H5客户端', PHONE: '电话', PC: 'PC端', OTHER: '其他',
};

const PRIORITY_CHIP_COLORS: Record<string, 'danger' | 'warning' | 'default'> = {
  URGENT: 'danger', CRITICAL: 'danger', NORMAL: 'default',
};

const STATE_BADGE: Record<string, string> = {
  CREATED: '待受理', ACCEPTED: '待指派', OUTLET_ASSIGNED: '待确认',
};

const TABS = [
  { key: 'CUSTOMER_REQUEST', label: '报修申请' },
  { key: 'CREATED', label: '待受理' },
  { key: 'ACCEPTED', label: '待指派' },
  { key: 'OUTLET_ASSIGNED', label: '已分配' },
];

export default function ReceptionPool() {
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('CUSTOMER_REQUEST');
  const [orders, setOrders] = useState<WorkOrderListItem[]>([]);
  const [allOrders, setAllOrders] = useState<WorkOrderListItem[]>([]);
  const [customerRequests, setCustomerRequests] = useState<CustomerRequestItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [bindingRequest, setBindingRequest] = useState<CustomerRequestItem | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningOrder, setAssigningOrder] = useState<WorkOrderListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [acceptFormOrder, setAcceptFormOrder] = useState<WorkOrderListItem | null>(null);
  const [bindingOfficialTitle, setBindingOfficialTitle] = useState('');
  const [bindingRemark, setBindingRemark] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      getCustomerRequests({ keyword, status: 'SUBMITTED', page: 1, pageSize: 200 }),
      getWorkOrders({ keyword, page: 1, pageSize: 200 }),
      getAllCustomers(),
    ])
      .then(([requestsResult, workOrdersResult, customersResult]) => {
        if (requestsResult.status === 'fulfilled') {
          setCustomerRequests(requestsResult.value.list);
        } else {
          setCustomerRequests([]);
          toast.danger('报修申请加载失败');
        }

        if (workOrdersResult.status === 'fulfilled') {
          const pool = workOrdersResult.value.list.filter((o) => (POOL_STATES as readonly string[]).includes(o.state));
          setAllOrders(pool);
        } else {
          setAllOrders([]);
          toast.danger('工单受理池加载失败');
        }

        if (customersResult.status === 'fulfilled') {
          setCustomers(customersResult.value);
        } else {
          setCustomers([]);
          toast.danger('客户列表加载失败，暂时无法转工单');
        }
      })
      .finally(() => setLoading(false));
  }, [keyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter by active tab
  useEffect(() => {
    setOrders(allOrders.filter((o) => o.state === activeTab));
  }, [allOrders, activeTab]);

  const handleAccept = async (data: { priority?: string; remark?: string; officialTitle?: string }) => {
    if (!acceptFormOrder) return;
    const id = acceptFormOrder.id;
    setActionId(id);
    try { await acceptWorkOrder(id, data); toast.success('工单已受理'); fetchData(); }
    catch { toast.danger('受理失败'); }
    finally { setActionId(null); setAcceptFormOrder(null); }
  };

  useEffect(() => {
    if (!selectedCustomerId) {
      setMachines([]);
      setSelectedMachineId('');
      return;
    }
    getMachines({ customerId: Number(selectedCustomerId), status: 'ACTIVE', page: 1, pageSize: 200 })
      .then((res) => {
        setMachines(res.list);
        setSelectedMachineId('');
      })
      .catch(() => {
        setMachines([]);
        setSelectedMachineId('');
      });
  }, [selectedCustomerId]);

  const openCustomerRequestBinding = (request: CustomerRequestItem) => {
    setBindingRequest(request);
    const matchedCustomer = customers.find((customer) => customer.phone === request.phone);
    setSelectedCustomerId(matchedCustomer ? String(matchedCustomer.id) : '');
    setSelectedMachineId('');
    setBindingOfficialTitle('');
    setBindingRemark('');
  };

  const handleAcceptCustomerRequest = async () => {
    if (!bindingRequest) return;
    if (!selectedCustomerId || !selectedMachineId) {
      toast.danger('请先选择真实客户和设备');
      return;
    }
    setActionId(bindingRequest.id);
    try {
      const selectedMachine = machines.find((machine) => machine.id === Number(selectedMachineId));
      await acceptCustomerRequest(bindingRequest.id, {
        customerId: Number(selectedCustomerId),
        machineId: Number(selectedMachineId),
        outletId: selectedMachine?.outletId ?? undefined,
        officialTitle: bindingOfficialTitle.trim() || undefined,
        remark: bindingRemark.trim() || undefined,
      });
      toast.success('报修申请已转为工单');
      setBindingRequest(null);
      fetchData();
    } catch {
      toast.danger('转工单失败');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectCustomerRequest = async (id: number) => {
    setActionId(id);
    try {
      await rejectCustomerRequest(id);
      toast.success('报修申请已驳回');
      fetchData();
    } catch {
      toast.danger('驳回失败');
    } finally {
      setActionId(null);
    }
  };

  const handleAssign = async (engineer: User) => {
    if (!assigningOrder) return;
    try {
      await assignWorkOrder(assigningOrder.id, engineer.id, engineer.name);
      toast.success(`已分配给 ${engineer.name}`);
      setAssignModalOpen(false); setAssigningOrder(null); fetchData();
    } catch { toast.danger('分配失败'); }
  };

  const stats = {
    pending: customerRequests.length + allOrders.filter((o) => o.state === 'CREATED').length,
    processing: allOrders.filter((o) => o.state !== 'CREATED').length,
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-16">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--warning)]/10">
            <Inbox className="h-5 w-5 text-[var(--warning)]" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--fg)]">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--warning)]" style={{ animation: 'pulse 2s infinite' }} />
              接单池
            </h1>
            <p className="text-xs text-[var(--muted)]">客户报修请求 · 待审核分诊</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="text-center"><div className="text-2xl font-extrabold text-[var(--warning)]">{stats.pending}</div><div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">待受理</div></div>
          <div className="text-center"><div className="text-2xl font-extrabold text-[var(--accent)]">{stats.processing}</div><div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">处理中</div></div>
          <div className="text-center"><div className="text-2xl font-extrabold text-[var(--success)]">{allOrders.length}</div><div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">总计</div></div>
        </div>
      </div>

      {/* ─── Search ─── */}
      <SearchField value={keyword} onChange={setKeyword} className="w-72" />

      {/* ─── Tab Bar ─── */}
      <div className="flex border-b-2 border-[var(--border)]">
        {TABS.map((tab) => {
          const count = tab.key === 'CUSTOMER_REQUEST'
            ? customerRequests.length
            : allOrders.filter((o) => o.state === tab.key).length;
          const isOn = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              data-testid={`pool-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-colors ${isOn ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--muted)] border-transparent hover:text-[var(--fg)]'}`}
            >
              {tab.label}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${isOn ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'bg-[var(--surface2)] text-[var(--muted)]'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ─── List ─── */}
      {loading ? (
        <LoadingView skeleton skeletonRows={6} />
      ) : activeTab === 'CUSTOMER_REQUEST' ? (
        customerRequests.length === 0 ? (
          <Card>
            <Card.Content className="flex flex-col items-center py-16">
              <EmptyView icon={Inbox} title="暂无报修申请" />
            </Card.Content>
          </Card>
        ) : (
          <div className="space-y-3">
            {customerRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 transition-all hover:border-[rgba(255,255,255,.12)]"
              >
                <div className="w-1 h-10 rounded-full flex-shrink-0 bg-[var(--warning)]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[var(--muted)]">{request.requestNo}</span>
                    <Chip color="warning" variant="primary" size="sm">客户提交</Chip>
                    <Chip color="default" variant="primary" size="sm">{SOURCE_LABELS[request.source] ?? request.source}</Chip>
                  </div>
                  <div className="text-sm font-semibold text-[var(--fg)]">{request.faultDesc}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-[var(--muted)]">
                    <span className="flex items-center gap-1"><UserCheck className="size-3" /> {request.customerName} · {request.phone}</span>
                    {request.machineSerial && <span className="flex items-center gap-1"><Wrench className="size-3" /> {request.machineSerial}</span>}
                    {request.address && <span className="truncate">地址：{request.address}</span>}
                    {request.latitude != null && request.longitude != null && (
                      <span className="truncate">
                        定位：{request.latitude.toFixed(6)}, {request.longitude.toFixed(6)}
                        {request.locationAccuracy ? `（约 ${Math.round(request.locationAccuracy)} 米）` : ''}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="size-3" /> {request.createdAt?.replace('T', ' ').slice(0, 16)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    data-testid="bind-customer-request-btn"
                    variant="primary"
                    size="sm"
                    className="bg-[var(--success)] border-[var(--success)]"
                    isDisabled={actionId === request.id}
                    onPress={() => openCustomerRequestBinding(request)}
                  >
                    <UserCheck className="size-3.5" />转工单
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--danger)]"
                    isDisabled={actionId === request.id}
                    onPress={() => handleRejectCustomerRequest(request.id)}
                  >
                    驳回
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : orders.length === 0 ? (
        <Card>
          <Card.Content className="flex flex-col items-center py-16">
            <EmptyView icon={Inbox} title={`暂无${STATE_BADGE[activeTab] || ''}工单`} />
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isUrgent = order.priority === 'URGENT' || order.priority === 'CRITICAL';
            return (
              <div
                key={order.id}
                className={`flex items-center gap-5 rounded-xl border px-5 py-4 transition-all cursor-pointer hover:border-[rgba(255,255,255,.12)] hover:translate-x-0.5 ${isUrgent ? 'border-l-[3px] border-l-[var(--danger)]' : 'border-[var(--border)]'} bg-[var(--surface)]`}
              >
                {/* Severity bar */}
                <div className={`w-1 h-10 rounded-full flex-shrink-0 ${isUrgent ? 'bg-[var(--danger)]' : order.priority === 'NORMAL' ? 'bg-[var(--border)]' : 'bg-[var(--warning)]'}`} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[var(--muted)]">{order.orderNo}</span>
                    <Chip color={PRIORITY_CHIP_COLORS[order.priority] ?? 'default'} variant="primary" size="sm">
                      {WORK_ORDER_PRIORITY_LABELS[order.priority]}
                    </Chip>
                    <Chip color="default" variant="primary" size="sm">{SOURCE_LABELS[order.source] ?? order.source}</Chip>
                  </div>
                  <div className="text-sm font-semibold text-[var(--fg)]">{order.officialTitle || order.title}</div>
                  <div className="flex gap-4 mt-1.5 text-[11px] text-[var(--muted)]">
                    <span className="flex items-center gap-1"><UserCheck className="size-3" /> {order.customerNameSnapshot}</span>
                    {order.machineSerialSnapshot && <span className="flex items-center gap-1"><Wrench className="size-3" /> {order.machineSerialSnapshot}</span>}
                    <span className="flex items-center gap-1"><Clock className="size-3" /> {order.createdAt?.replace('T', ' ').slice(0, 16)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {order.state === 'CREATED' ? (
                    <>
                      <Button
                        data-testid="accept-work-order-btn"
                        variant="primary"
                        size="sm"
                        className="bg-[var(--success)] border-[var(--success)]"
                        isDisabled={actionId === order.id}
                        onPress={() => setAcceptFormOrder(order)}
                      >
                        <UserCheck className="size-3.5" />{actionId === order.id ? '受理中...' : '受理'}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-[var(--danger)]">驳回</Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onPress={() => { setAssigningOrder(order); setAssignModalOpen(true); }}
                      >
                        <UserPlus className="size-3.5" />{order.engineerName ? '重分配' : '分配工程师'}
                      </Button>
                      {order.engineerName && (
                        <Chip color="success" variant="primary" size="sm">{order.engineerName}</Chip>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(245,158,11,.4)}50%{opacity:.5;box-shadow:0 0 0 8px rgba(245,158,11,0)}}`}</style>

      <AssignModal
        open={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); setAssigningOrder(null); }}
        onAssign={handleAssign}
        workOrderInfo={assigningOrder ? { orderNo: assigningOrder.orderNo, title: assigningOrder.title, faultType: assigningOrder.title } : undefined}
        outletId={assigningOrder?.outletId ?? undefined}
      />

      <AcceptForm
        key={acceptFormOrder?.id ?? 'accept-form'}
        open={acceptFormOrder !== null}
        onClose={() => setAcceptFormOrder(null)}
        onSubmit={handleAccept}
      />

      {bindingRequest && (
        <div data-testid="customer-request-bind-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)]">
          <div className="w-[560px] rounded-2xl bg-[var(--surface)] p-6 shadow-[var(--overlay-shadow)]">
            <h2 className="text-base font-semibold text-[var(--fg)]">绑定真实客户和设备</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">客户填写的信息只作为线索，正式工单必须关联机台主数据。</p>

            <div className="mt-4 rounded-xl bg-[var(--surface2)] p-3 text-xs text-[var(--muted)]">
              <div>报修人：{bindingRequest.customerName} · {bindingRequest.phone}</div>
              <div>客户填写设备编号：{bindingRequest.machineSerial || '未填写'}</div>
              <div>客户填写设备型号：{bindingRequest.machineModel || '未填写'}</div>
              <div className="mt-1 text-[var(--fg)]">故障描述：{bindingRequest.faultDesc}</div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--fg)]">真实客户 *</label>
                <select
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--fg)]"
                  value={selectedCustomerId}
                  onChange={(event) => setSelectedCustomerId(event.target.value)}
                >
                  <option value="">请选择客户</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.companyName} · {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--fg)]">真实设备 *</label>
                <select
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--fg)]"
                  value={selectedMachineId}
                  onChange={(event) => setSelectedMachineId(event.target.value)}
                  disabled={!selectedCustomerId}
                >
                  <option value="">{selectedCustomerId ? '请选择设备' : '请先选择客户'}</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.serialNo} · {machine.model} · {machine.currentHours ?? '-'}小时
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--fg)]">正式标题 <span className="text-xs text-[var(--muted)]">(可选)</span></label>
                <input
                  data-testid="binding-official-title"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                  placeholder="留空则自动生成"
                  value={bindingOfficialTitle}
                  onChange={(e) => setBindingOfficialTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--fg)]">受理备注 <span className="text-xs text-[var(--muted)]">(可选)</span></label>
                <textarea
                  data-testid="binding-remark"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                  rows={2}
                  placeholder="填写受理备注..."
                  value={bindingRemark}
                  onChange={(e) => setBindingRemark(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onPress={() => setBindingRequest(null)}>取消</Button>
              <Button
                variant="primary"
                size="sm"
                isDisabled={!selectedCustomerId || !selectedMachineId || actionId === bindingRequest.id}
                onPress={handleAcceptCustomerRequest}
              >
                {actionId === bindingRequest.id ? '处理中...' : '确认转工单'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, Table, Chip, Spinner, Button } from '@heroui/react';
import { AlertTriangle, ArrowRight, RefreshCw, TrendingUp, TrendingDown, Minus, QrCode as QrCodeIcon, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { WorkOrderListItem } from '@kinho/shared-types';
import { WORK_ORDER_STATE_LABELS, WORK_ORDER_PRIORITY_LABELS } from '@kinho/shared-types';
import { getDashboardReport, type DashboardReport } from '@/services/report-data';
import { getWorkOrders } from '@/services/work-order';

const STATE_CHIP_COLOR: Record<string, 'accent' | 'warning' | 'success' | 'danger' | 'default'> = {
  CREATED: 'accent', ACCEPTED: 'accent', OUTLET_ASSIGNED: 'accent',
  ENGINEER_ASSIGNED: 'accent', SIGNED_IN: 'default', FAULT_CONFIRMED: 'default',
  REPAIRING: 'warning', PENDING_SIGNATURE: 'default', REPAIR_COMPLETED: 'success',
  FOLLOW_UP_PENDING: 'accent', CLOSED: 'success', CANCELLED: 'danger',
};

const PRIORITY_CHIP_COLOR: Record<string, 'danger' | 'warning' | 'default'> = {
  URGENT: 'danger', CRITICAL: 'danger', NORMAL: 'default',
};

const TOOLTIP_STYLE = {
  background: '#1a1d24', border: '1px solid #252830', borderRadius: 8, fontSize: 12,
};

const DONUT_COLORS = ['#60a5fa', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444', '#6366f1', '#38bdf8', '#6b7280'];

function getPublicRepairUrl() {
  return (import.meta as any).env?.VITE_CUSTOMER_H5_BASE_URL || `${window.location.protocol}//${window.location.hostname}:3002`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [recentOrders, setRecentOrders] = useState<WorkOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrCopied, setQrCopied] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError('');
    Promise.all([
      getDashboardReport(),
      getWorkOrders({ page: 1, pageSize: 10 }),
    ])
      .then(([r, orders]) => { setReport(r); setRecentOrders(orders.list); })
      .catch(() => setError('数据加载失败，请稍后重试'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openQr = async () => {
    setQrOpen((open) => !open);
    if (qrDataUrl) return;
    const url = getPublicRepairUrl();
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch { setQrDataUrl(''); }
  };

  const copyQrUrl = () => {
    navigator.clipboard.writeText(getPublicRepairUrl());
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2000);
  };

  const urgentCount = report?.priorityDistribution.find(p => p.name === 'URGENT')?.value ?? 0;
  const criticalCount = report?.priorityDistribution.find(p => p.name === 'CRITICAL')?.value ?? 0;
  const repairingStates = ['REPAIRING', 'SIGNED_IN', 'FAULT_CONFIRMED', 'ENGINEER_ASSIGNED'];
  const repairingCount = report?.statusDistribution
    .filter(s => repairingStates.includes(s.name))
    .reduce((sum, s) => sum + s.value, 0) ?? 0;
  const pendingSignCount = report?.statusDistribution.find(s => s.name === 'PENDING_SIGNATURE')?.value ?? 0;
  const completedCount = report?.statusDistribution.find(s => s.name === 'CLOSED')?.value ?? 0;
  const followUpCount = report?.statusDistribution.find(s => s.name === 'FOLLOW_UP_PENDING')?.value ?? 0;
  const createdCount = report?.statusDistribution.find(s => s.name === 'CREATED')?.value ?? 0;

  const urgentOrders = recentOrders.filter(o => o.priority === 'URGENT' || o.priority === 'CRITICAL').slice(0, 5);

  const trendData = (report?.trendData ?? []).map(d => ({
    date: d.date.slice(5),
    count: d.count,
  }));

  const statusPieData = (report?.statusDistribution ?? []).map(s => ({
    name: WORK_ORDER_STATE_LABELS[s.name as keyof typeof WORK_ORDER_STATE_LABELS] || s.name,
    value: s.value,
  }));

  const faultData = (report?.faultTypeDistribution ?? [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="size-10 text-[var(--warning)]" />
        <p className="text-sm text-[var(--muted)]">{error}</p>
        <Button variant="ghost" size="sm" onPress={fetchData}><RefreshCw className="size-4" /> 重试</Button>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)]">分析看板</h1>
          <p className="mt-1 flex items-center gap-2 text-xs font-medium text-[var(--warning)]">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse" />
            LIVE · {report?.total ?? 0} 活跃工单 · 系统运行中
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onPress={openQr}>
              <QrCodeIcon className="size-3.5" /> 报修二维码
            </Button>
            {qrOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--overlay-shadow)]">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-[var(--foreground)]">客户报修二维码</div>
                  <p className="mt-1 text-xs text-[var(--muted)]">客户扫码后可匿名提交报修工单</p>
                </div>
                <div className="flex justify-center">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="报修二维码" className="rounded-lg border border-[var(--border)]" width={240} height={240} />
                  ) : (
                    <div className="flex h-[240px] w-[240px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]">
                      <Spinner size="sm" />
                    </div>
                  )}
                </div>
                <div className="mt-3 rounded-lg bg-[var(--surface-secondary)] px-3 py-2 text-center font-mono text-xs text-[var(--muted)] break-all">
                  {getPublicRepairUrl()}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onPress={copyQrUrl}>
                    {qrCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {qrCopied ? '已复制' : '复制链接'}
                  </Button>
                  <Button variant="ghost" size="sm" onPress={() => setQrOpen(false)}>关闭</Button>
                </div>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-[var(--muted)]" onPress={fetchData}>
            <RefreshCw className="size-3.5" /> 刷新
          </Button>
        </div>
      </div>

      {/* ─── 5 Bottleneck KPI Cards ─── */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: '待受理', value: createdCount, color: 'var(--accent)', accent: 'border-t-[var(--accent)]', trend: 'down', wait: '4h', path: '/work-orders?state=CREATED' },
          { label: '维修中', value: repairingCount, color: 'var(--warning)', accent: 'border-t-[var(--warning)]', trend: 'up', wait: '3d', path: '/work-orders?state=REPAIRING' },
          { label: '待回访', value: followUpCount, color: '#8b5cf6', accent: 'border-t-[#8b5cf6]', trend: 'flat', wait: '1d', path: '/work-orders?state=FOLLOW_UP_PENDING' },
          { label: '待签名', value: pendingSignCount, color: 'var(--accent)', accent: 'border-t-[var(--accent)]', trend: 'up', wait: '8h', path: '/work-orders?state=PENDING_SIGNATURE' },
          { label: '本月完成', value: completedCount, color: 'var(--success)', accent: 'border-t-[var(--success)]', trend: 'up', wait: '—', path: '/work-orders?state=CLOSED' },
        ].map((kpi) => (
          <Card key={kpi.label} className={`border-t-[3px] ${kpi.accent} cursor-pointer transition-shadow hover:shadow-lg`} onClick={() => navigate(kpi.path)}>
            <Card.Content className="p-4">
              <div className="text-3xl font-extrabold tracking-tight" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{kpi.label}</span>
                {kpi.trend === 'up' && <TrendingUp className="size-3 text-[var(--danger)]" />}
                {kpi.trend === 'down' && <TrendingDown className="size-3 text-[var(--success)]" />}
                {kpi.trend === 'flat' && <Minus className="size-3 text-[var(--muted)]" />}
              </div>
              {kpi.wait !== '—' && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted)]">
                  最久等待 <span className="font-semibold text-[var(--warning)]">{kpi.wait}</span>
                </div>
              )}
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* ─── Urgent Attention + Trend ─── */}
      <div className="grid grid-cols-[1fr_2fr] gap-4">
        {/* Urgent Orders */}
        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold">需要立即关注</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger)]/10">
                <span className="text-2xl font-extrabold text-[var(--danger)]">{urgentCount + criticalCount}</span>
              </div>
              <div>
                <div className="font-bold text-[var(--danger)]">紧急 / 严重工单</div>
                <div className="text-[11px] text-[var(--muted)]">URGENT {urgentCount} · CRITICAL {criticalCount}</div>
              </div>
            </div>
            {urgentOrders.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">暂无紧急工单</p>
            ) : (
              <div className="flex flex-col gap-2">
                {urgentOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-xs cursor-pointer hover:border-[var(--accent)]/30 transition-colors"
                    onClick={() => navigate(`/work-orders/${o.id}`)}
                  >
                    <span className="font-mono font-semibold text-[var(--accent)]">{o.orderNo}</span>
                    <span className="truncate mx-2 flex-1 text-[var(--muted)]">{o.title}</span>
                    <Chip
                      color={PRIORITY_CHIP_COLOR[o.priority as keyof typeof PRIORITY_CHIP_COLOR] ?? 'default'}
                      variant="primary" size="sm"
                    >
                      {WORK_ORDER_PRIORITY_LABELS[o.priority as keyof typeof WORK_ORDER_PRIORITY_LABELS] ?? o.priority}
                    </Chip>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Trend Line Chart */}
        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold">30 天工单趋势</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-5">
            {trendData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-[var(--muted)]">暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252830" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#e4e4e7' }} />
                  <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* ─── Fault Types + Priority ─── */}
      <div className="grid grid-cols-[2fr_1fr] gap-4">
        {/* Fault Types with bar charts */}
        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold">故障分类</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-5">
            {faultData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-[var(--muted)]">暂无数据</div>
            ) : (
              <div className="flex flex-col gap-3">
                {faultData.map((f, i) => {
                  const maxVal = faultData[0]?.value ?? 1;
                  const pct = Math.round((f.value / maxVal) * 100);
                  return (
                    <div key={f.name} className="flex items-center gap-3">
                      <span className="w-5 text-right text-[11px] text-[var(--muted)] tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="w-20 text-xs">{f.name}</span>
                      <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-7 text-right text-xs font-semibold tabular-nums">{f.value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Status Donut */}
        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold">状态分布</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-5">
            {statusPieData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-[var(--muted)]">暂无数据</div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={44} outerRadius={64} paddingAngle={3} dataKey="value">
                      {statusPieData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, _name, props) => [`${value} 单`, props.payload.name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] justify-center">
                  {statusPieData.filter(p => p.value > 0).map((p, i) => (
                    <span key={p.name} className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      {p.name} {p.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* ─── Recent Orders Table ─── */}
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <Card.Title className="text-sm font-semibold">最近工单</Card.Title>
            <Button variant="ghost" size="sm" className="gap-1 text-[var(--muted)] text-xs" onPress={() => navigate('/work-orders')}>
              查看全部 <ArrowRight size={12} />
            </Button>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="最近工单">
                <Table.Header>
                  <Table.Column isRowHeader>编号</Table.Column>
                  <Table.Column isRowHeader>标题</Table.Column>
                  <Table.Column isRowHeader>优先级</Table.Column>
                  <Table.Column isRowHeader>状态</Table.Column>
                  <Table.Column isRowHeader>网点</Table.Column>
                  <Table.Column isRowHeader>时间</Table.Column>
                </Table.Header>
                <Table.Body items={recentOrders} renderEmptyState={() => <div className="py-8 text-sm text-[var(--muted)]">暂无工单</div>}>
                  {(order) => (
                    <Table.Row key={order.id} className="cursor-pointer" onAction={() => navigate(`/work-orders/${order.id}`)}>
                      <Table.Cell>
                        <span className="font-mono text-xs font-semibold text-[var(--accent)]">{order.orderNo}</span>
                      </Table.Cell>
                      <Table.Cell className="text-xs max-w-[160px] truncate">{order.title}</Table.Cell>
                      <Table.Cell>
                        <Chip color={PRIORITY_CHIP_COLOR[order.priority as keyof typeof PRIORITY_CHIP_COLOR] ?? 'default'} variant="primary" size="sm">
                          {WORK_ORDER_PRIORITY_LABELS[order.priority as keyof typeof WORK_ORDER_PRIORITY_LABELS] ?? order.priority}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip color={STATE_CHIP_COLOR[order.state] ?? 'default'} variant="primary" size="sm">
                          {WORK_ORDER_STATE_LABELS[order.state] ?? order.state}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell className="text-xs text-[var(--muted)]">{order.outletName}</Table.Cell>
                      <Table.Cell className="text-[11px] text-[var(--muted)] whitespace-nowrap">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '-'}
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card.Content>
      </Card>
    </div>

    </>
  );
}

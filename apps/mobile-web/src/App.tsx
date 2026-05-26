import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router';
import {
  Bell,
  Boxes,
  ClipboardList,
  CheckCircle,
  FileText,
  Home,
  LogOut,
  PackageSearch,
  RefreshCw,
  Search,
  ScanSearch,
  AlertTriangle,
  ShieldCheck,
  Truck,
  UserCircle2,
  Users,
  XCircle,
  Warehouse,
  Workflow,
} from 'lucide-react';
import type { ApprovalItem, ApprovalType, Customer, InventoryBalance, Machine, PaginatedResponse, WorkOrderDetail, WorkOrderListItem } from '@kinho/shared-types';
import { getCachedUser, getMe, getMyPermissions, login, logout, type CurrentUser } from './services/auth';
import { getWorkOrderById, getWorkOrders, signInOrder, startRepair } from './services/work-order';
import { approveApproval, approveEscalation, getApprovals, rejectApproval } from './services/approval';
import { getMyWarehouses } from './services/warehouse';
import { apiGet, apiPost } from './utils/api-client';
import { priorityLabel, stateLabel } from './utils/labels';
import WorkflowActionPanel from './components/WorkflowActionPanel';

type TabKey = 'home' | 'orders' | 'inventory' | 'approvals' | 'profile';

function AuthGate({ children }: { children: ReactNode }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

function Shell({ children, active }: { children: ReactNode; active: TabKey }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUser | null>(getCachedUser());

  useEffect(() => {
    if (!user) getMe().then(setUser).catch(() => undefined);
  }, [user]);

  const navItems = [
    { key: 'home' as const, label: '首页', icon: Home, to: '/' },
    { key: 'orders' as const, label: '工单', icon: ClipboardList, to: '/orders' },
    { key: 'inventory' as const, label: '库存', icon: Warehouse, to: '/inventory' },
    { key: 'approvals' as const, label: '审批', icon: CheckCircle, to: '/approvals' },
    { key: 'profile' as const, label: '我的', icon: UserCircle2, to: '/profile' },
  ];

  return (
    <div className="mweb-app">
      <header className="mweb-topbar">
        <div className="mweb-brand">
          <div className="mweb-brand-mark">MG</div>
          <div className="mweb-brand-text">
            <div className="mweb-brand-title">Machinery Guard</div>
            <div className="mweb-brand-sub">{user?.name || user?.username || '未登录'}</div>
          </div>
        </div>
        <div className="mweb-top-actions">
          <button className="mweb-icon-btn" type="button" aria-label="通知"><Bell size={18} /></button>
          <button
            className="mweb-icon-btn"
            type="button"
            aria-label="退出登录"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="mweb-main">{children}</main>

      <nav className="mweb-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = item.key === active;
          return (
            <button key={item.key} type="button" className={`mweb-nav-item ${selected ? 'is-active' : ''}`} onClick={() => navigate(item.to)}>
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function PageHeader({
  title,
  subtitle,
  icon: Icon,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  icon: typeof ClipboardList;
  onRefresh?: () => void;
}) {
  return (
    <div className="mweb-section-head">
      <div className="mweb-title-row">
        <div className="mweb-title-icon"><Icon size={18} /></div>
        <div>
          <div className="mweb-section-title">{title}</div>
          {subtitle ? <div className="mweb-section-sub">{subtitle}</div> : null}
        </div>
      </div>
      {onRefresh ? <button className="mweb-icon-btn" type="button" onClick={onRefresh} aria-label="刷新"><RefreshCw size={16} /></button> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="mweb-empty">{text}</div>;
}

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
      await getMe().catch(() => undefined);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mweb-login">
      <div className="mweb-login-panel">
        <section className="mweb-login-hero">
          <div className="mweb-login-badge">MG</div>
          <div className="mweb-login-copy">
            <h1>Machinery Guard</h1>
            <p>工程机械售后</p>
          </div>
        </section>

        <form onSubmit={onSubmit} className="mweb-login-card">
          <div className="mweb-field">
            <label>用户名</label>
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </div>
          <div className="mweb-field">
            <label>密码</label>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </div>
          {error ? <div className="mweb-error">{error}</div> : null}
          <button className="mweb-primary" type="submit" disabled={loading}>{loading ? '登录中...' : '登录'}</button>
        </form>

        <div className="mweb-login-foot">工单 / 资产 / 库存 / 流程</div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ created: 0, repairing: 0, pendingSignature: 0, followUp: 0, closed: 0 });
  const [recent, setRecent] = useState<WorkOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getWorkOrders({ page: 1, pageSize: 20 }),
      getWorkOrders({ page: 1, pageSize: 1, state: 'CREATED' }),
      getWorkOrders({ page: 1, pageSize: 1, state: 'REPAIRING' }),
      getWorkOrders({ page: 1, pageSize: 1, state: 'PENDING_SIGNATURE' }),
      getWorkOrders({ page: 1, pageSize: 1, state: 'FOLLOW_UP_PENDING' }),
      getWorkOrders({ page: 1, pageSize: 1, state: 'CLOSED' }),
    ])
      .then(([list, created, repairing, pendingSignature, followUp, closed]) => {
        setRecent(list.list.slice(0, 4));
        setStats({
          created: created.total,
          repairing: repairing.total,
          pendingSignature: pendingSignature.total,
          followUp: followUp.total,
          closed: closed.total,
        });
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Shell active="home">
      <section className="mweb-hero-card">
        <div className="mweb-kicker">移动工作台</div>
        <h2>移动售后工作台</h2>
      </section>

      <section className="mweb-stats">
        <article className="mweb-stat"><span>待受理</span><strong>{loading ? '...' : stats.created}</strong><em>CREATED</em></article>
        <article className="mweb-stat"><span>维修中</span><strong>{loading ? '...' : stats.repairing}</strong><em>REPAIRING</em></article>
        <article className="mweb-stat"><span>待签字</span><strong>{loading ? '...' : stats.pendingSignature}</strong><em>PENDING_SIGNATURE</em></article>
        <article className="mweb-stat"><span>待回访</span><strong>{loading ? '...' : stats.followUp}</strong><em>FOLLOW_UP_PENDING</em></article>
        <article className="mweb-stat"><span>已关闭</span><strong>{loading ? '...' : stats.closed}</strong><em>CLOSED</em></article>
      </section>

      {error ? <div className="mweb-error">{error}</div> : null}

      <section className="mweb-section">
        <PageHeader title="最近工单" icon={ClipboardList} onRefresh={load} />
        <div className="mweb-list">
          {recent.length === 0 && !loading ? <EmptyState text="暂无数据" /> : null}
          {recent.map((order) => <OrderCard key={order.id} order={order} onClick={() => navigate(`/orders/${order.id}`)} />)}
        </div>
      </section>

      <section className="mweb-section">
        <PageHeader title="快捷入口" icon={ScanSearch} />
        <div className="mweb-quick-grid">
          <QuickCard icon={ClipboardList} title="工单列表" onClick={() => navigate('/orders')} />
          <QuickCard icon={Truck} title="机台管理" onClick={() => navigate('/machines')} />
          <QuickCard icon={Users} title="客户管理" onClick={() => navigate('/customers')} />
          <QuickCard icon={Warehouse} title="库存总览" onClick={() => navigate('/inventory')} />
        </div>
      </section>
    </Shell>
  );
}

function QuickCard({
  icon: Icon,
  title,
  onClick,
}: {
  icon: typeof ClipboardList;
  title: string;
  onClick: () => void;
}) {
  return (
    <button className="mweb-quick-card" type="button" onClick={onClick}>
      <Icon size={20} />
      <strong>{title}</strong>
    </button>
  );
}

function OrderCard({ order, onClick }: { order: WorkOrderListItem; onClick: () => void }) {
  const stateClass = order.state === 'REPAIRING' ? 'warn' : order.state === 'CLOSED' ? 'success' : order.state === 'CANCELLED' ? 'danger' : 'accent';
  return (
    <button type="button" className="mweb-card-item" onClick={onClick}>
      <div className="mweb-card-item-main">
        <div className="mweb-order-no">{order.orderNo}</div>
        <div className="mweb-order-title">{order.title}</div>
        <div className="mweb-order-meta">
          <span>{order.customerNameSnapshot || '-'}</span>
          <span>{order.outletName || '待分配网点'}</span>
          <span>{order.engineerName || '待分配工程师'}</span>
        </div>
      </div>
      <span className={`mweb-chip ${stateClass}`}>{stateLabel(order.state)}</span>
    </button>
  );
}

function OrderListPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<WorkOrderListItem[]>([]);
  const [state, setState] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getWorkOrders({ keyword: keyword || undefined, state: state || undefined, page: 1, pageSize: 50 })
      .then((res) => { setList(res.list); setError(''); })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [keyword, state]);

  useEffect(() => { load(); }, [load]);

  const tabs = useMemo(() => [
    ['', '全部'],
    ['CREATED', '待受理'],
    ['OUTLET_ASSIGNED', '待派工'],
    ['REPAIRING', '维修中'],
    ['PENDING_SIGNATURE', '待签字'],
    ['FOLLOW_UP_PENDING', '待回访'],
  ] as const, []);

  return (
    <Shell active="orders">
      <section className="mweb-section">
        <PageHeader title="工单列表" subtitle="与 PC 同步" icon={ClipboardList} onRefresh={load} />

        <form className="mweb-search-bar" onSubmit={(event) => { event.preventDefault(); load(); }}>
          <Search size={17} />
          <input value={keyword} placeholder="搜索工单" onChange={(event) => setKeyword(event.target.value)} />
          <button className="mweb-primary small" type="submit">搜索</button>
        </form>

        <div className="mweb-tab-row">
          {tabs.map(([key, label]) => (
            <button key={key || 'all'} type="button" className={`mweb-tab ${state === key ? 'active' : ''}`} onClick={() => setState(key)}>{label}</button>
          ))}
        </div>

        {error ? <div className="mweb-error">{error}</div> : null}
        {loading ? <div className="mweb-muted">加载中...</div> : null}
        {!loading && list.length === 0 ? <EmptyState text="暂无数据" /> : null}
        <div className="mweb-list">
          {list.map((order) => <OrderCard key={order.id} order={order} onClick={() => navigate(`/orders/${order.id}`)} />)}
        </div>
      </section>
    </Shell>
  );
}

function OrderDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [detail, setDetail] = useState<WorkOrderDetail | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const currentUser = getCachedUser();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getWorkOrderById(id);
      setDetail(res);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    getMyPermissions()
      .then((res) => {
        setPermissions(res.permissions || []);
        setRole(res.role || currentUser?.role || '');
      })
      .catch(() => {
        setPermissions([]);
        setRole(currentUser?.role || '');
      });
    void load();
  }, [currentUser?.role, load]);

  const runAction = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell active="orders">
      <section className="mweb-section">
        <PageHeader title="工单详情" subtitle="与 PC 同步" icon={FileText} onRefresh={load} />
        {loading ? <div className="mweb-muted">加载中...</div> : null}
        {error ? <div className="mweb-error">{error}</div> : null}
        {!loading && detail ? (
          <div className="mweb-detail">
            <div className="mweb-detail-hero">
              <div>
                <div className="mweb-order-no">{detail.orderNo}</div>
                <div className="mweb-order-title">{detail.title}</div>
              </div>
              <div className="mweb-detail-badges">
                <span className="mweb-chip accent">{stateLabel(detail.state)}</span>
                <span className="mweb-chip">{priorityLabel(detail.priority)}</span>
                <span className={`mweb-chip ${detail.isUnderWarranty ? 'success' : 'warn'}`}>{detail.isUnderWarranty ? '三包内' : '三包外'}</span>
              </div>
            </div>

            <div className="mweb-info-grid">
              <InfoCard label="客户" value={detail.customerNameSnapshot} />
              <InfoCard label="电话" value={detail.customerPhoneSnapshot} />
              <InfoCard label="设备" value={detail.machineModelSnapshot || detail.machineSerialSnapshot || '-'} />
              <InfoCard label="网点" value={detail.outletName || '待分配'} />
            </div>

            <InfoBlock label="服务地址" value={detail.serviceAddressSnapshot || '-'} />
            <InfoBlock label="故障描述" value={detail.description || detail.faultDesc || '-'} />
            <PhotoBlock photos={parsePhotoList(detail.faultPhotos)} />
            <InfoBlock label="工程师" value={detail.engineerName || '待分配'} />

            <WorkflowActionPanel
              workOrderId={id}
              state={detail.state}
              role={role || currentUser?.role || ''}
              permissions={permissions}
              currentUser={currentUser}
              outletId={detail.outletId}
              isAssignedEngineer={currentUser?.id === detail.engineerId}
              isOutletManagerForOrder={Boolean(currentUser?.role === 'outlet_manager' && currentUser?.outletId === detail.outletId)}
              onDone={load}
            />

            <div className="mweb-action-stack">
              {detail.state === 'ENGINEER_ASSIGNED' ? <button className="mweb-primary" type="button" disabled={busy} onClick={() => runAction(() => signInOrder(id))}>签到</button> : null}
              {detail.state === 'FAULT_CONFIRMED' ? <button className="mweb-primary" type="button" disabled={busy} onClick={() => runAction(() => startRepair(id))}>开始维修</button> : null}
            </div>

            <Timeline detail={detail} />
          </div>
        ) : null}
      </section>
    </Shell>
  );
}

function InfoCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mweb-info-card">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mweb-block">
      <div className="mweb-block-label">{label}</div>
      <div className="mweb-block-value">{value}</div>
    </div>
  );
}

function parsePhotoList(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
  } catch {
    return [];
  }
}

function PhotoBlock({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;
  return (
    <div className="mweb-block">
      <div className="mweb-block-label">故障图片</div>
      <div className="mweb-photo-grid">
        {photos.map((photo, index) => (
          <a key={`${photo.slice(0, 24)}-${index}`} href={photo} target="_blank" rel="noreferrer" className="mweb-photo-link">
            <img src={photo} alt={`故障图片 ${index + 1}`} />
          </a>
        ))}
      </div>
    </div>
  );
}

function Timeline({ detail }: { detail: WorkOrderDetail }) {
  const steps = [
    ['CREATED', detail.createdAt, '创建'],
    ['ACCEPTED', detail.acceptedAt, '受理'],
    ['OUTLET_ASSIGNED', detail.outletAssignedAt, '派网点'],
    ['ENGINEER_ASSIGNED', detail.engineerAssignedAt, '派工程师'],
    ['SIGNED_IN', detail.signedInAt, '签到'],
    ['FAULT_CONFIRMED', detail.faultConfirmedAt, '确认故障'],
    ['REPAIRING', detail.repairStartedAt, '维修中'],
    ['PENDING_SIGNATURE', detail.receiptSubmittedAt, '回执'],
    ['REPAIR_COMPLETED', detail.customerSignedAt, '签字'],
    ['FOLLOW_UP_PENDING', detail.completedAt, '回访'],
    ['CLOSED', detail.closedAt, '关闭'],
  ] as const;

  return (
    <div className="mweb-history">
      <div className="mweb-section-title">流程</div>
      <div className="mweb-timeline">
        {steps.filter(([, time]) => Boolean(time)).map(([stage, time, desc]) => (
          <div key={stage} className="mweb-step">
            <span className={`mweb-dot ${detail.state === stage ? 'current' : ''}`} />
            <div>
              <div className="mweb-step-title">{desc}</div>
              <div className="mweb-step-desc">{stateLabel(stage)}</div>
            </div>
            <div className="mweb-step-time">{new Date(time as string).toLocaleString('zh-CN')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetsPage() {
  const navigate = useNavigate();
  return (
    <Shell active="inventory">
      <section className="mweb-section">
        <PageHeader title="资产与库存" subtitle="客户、机台、库存" icon={Boxes} />
        <div className="mweb-feature-list">
          <FeatureRow icon={Users} title="客户管理" desc="客户信息" onClick={() => navigate('/customers')} />
          <FeatureRow icon={Truck} title="机台管理" desc="设备信息" onClick={() => navigate('/machines')} />
          <FeatureRow icon={Warehouse} title="库存总览" desc="库存信息" onClick={() => navigate('/inventory')} />
        </div>
      </section>
    </Shell>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: typeof Users;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="mweb-feature-row" onClick={onClick}>
      <div className="mweb-title-icon"><Icon size={18} /></div>
      <div>
        <strong>{title}</strong>
        <span>{desc}</span>
      </div>
    </button>
  );
}

function CustomersPage() {
  const [list, setList] = useState<Customer[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiGet<PaginatedResponse<Customer>>('/customers', { keyword, page: 1, pageSize: 50 })
      .then((res) => { setList(res.list || []); setError(''); })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [keyword]);

  useEffect(() => { load(); }, [load]);

  return (
    <Shell active="inventory">
      <section className="mweb-section">
        <PageHeader title="客户管理" subtitle="客户信息" icon={Users} onRefresh={load} />
        <SearchForm value={keyword} onChange={setKeyword} onSubmit={load} placeholder="搜索客户" />
        {error ? <div className="mweb-error">{error}</div> : null}
        {loading ? <div className="mweb-muted">加载中...</div> : null}
        {!loading && list.length === 0 ? <EmptyState text="暂无数据" /> : null}
        <div className="mweb-list">
          {list.map((customer) => (
            <article className="mweb-data-card" key={customer.id}>
              <div className="mweb-card-top">
                <strong>{customer.companyName}</strong>
                <span className="mweb-chip accent">{customer.outletName || '未分配'}</span>
              </div>
              <div className="mweb-data-grid">
                <span>联系人：{customer.contactPerson || '-'}</span>
                <span>电话：{customer.phone || '-'}</span>
                <span>地址：{customer.address || '-'}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Shell>
  );
}

function MachinesPage() {
  const [list, setList] = useState<Machine[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiGet<PaginatedResponse<Machine>>('/machines', { keyword, page: 1, pageSize: 50 })
      .then((res) => { setList(res.list || []); setError(''); })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [keyword]);

  useEffect(() => { load(); }, [load]);

  return (
    <Shell active="inventory">
      <section className="mweb-section">
        <PageHeader title="机台管理" subtitle="设备信息" icon={Truck} onRefresh={load} />
        <SearchForm value={keyword} onChange={setKeyword} onSubmit={load} placeholder="搜索机台" />
        {error ? <div className="mweb-error">{error}</div> : null}
        {loading ? <div className="mweb-muted">加载中...</div> : null}
        {!loading && list.length === 0 ? <EmptyState text="暂无数据" /> : null}
        <div className="mweb-list">
          {list.map((machine) => {
            const warranty = getMachineWarranty(machine);
            return (
              <article className="mweb-data-card" key={machine.id}>
                <div className="mweb-card-top">
                  <strong>{machine.serialNo}</strong>
                  <span className={`mweb-chip ${warranty.className}`}>{warranty.label}</span>
                </div>
                <div className="mweb-data-grid">
                  <span>型号：{machine.model || '-'}</span>
                  <span>客户：{machine.customerName || '-'}</span>
                  <span>运行：{machine.currentHours != null ? `${machine.currentHours} 小时` : '-'}</span>
                  <span>收货：{machine.purchaseDate ? machine.purchaseDate.slice(0, 10) : '-'}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </Shell>
  );
}

function getMachineWarranty(machine: Machine) {
  const hours = machine.currentHours;
  const startDate = machine.purchaseDate || machine.warrantyStartDate;
  const explicitEnd = machine.warrantyEndDate || machine.warrantyExpiry;
  const endDate = explicitEnd || (startDate ? addYears(startDate, 1) : null);
  const withinHours = hours != null && Number(hours) <= 3000;
  const withinDate = endDate ? new Date(endDate).getTime() >= Date.now() : false;
  if (withinHours || withinDate) return { label: '三包内', className: 'success' };
  if (hours == null && !endDate) return { label: '未配置', className: '' };
  return { label: '三包外', className: 'danger' };
}

function addYears(value: string, years: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString();
}

function InventoryPage() {
  const currentUser = getCachedUser();
  const [list, setList] = useState<InventoryBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Awaited<ReturnType<typeof getMyWarehouses>>>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryBalance | null>(null);
  const [requestQty, setRequestQty] = useState('1');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiGet<PaginatedResponse<InventoryBalance> | InventoryBalance[]>('/inventory/balances', { keyword, page: 1, pageSize: 50 })
      .then((res) => { setList(Array.isArray(res) ? res : res.list || []); setError(''); })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [keyword]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getMyWarehouses().then(setWarehouses).catch(() => setWarehouses([])); }, []);

  const outletWarehouse = warehouses.find((warehouse) => warehouse.type === 'OUTLET_WAREHOUSE' && (currentUser?.outletId ? warehouse.outletId === currentUser.outletId : true));
  const engineerWarehouse = warehouses.find((warehouse) => warehouse.type === 'ENGINEER_WAREHOUSE' && warehouse.ownerEngineerId === currentUser?.id);
  const canRequest = Boolean(currentUser?.role === 'engineer' && outletWarehouse && engineerWarehouse);
  void requesting;
  void requestError;
  void canRequest;
  void selectedItem;
  void requestQty;
  void outletWarehouse;
  void engineerWarehouse;

  const submitPartsRequest = async () => {
    if (!selectedItem || !outletWarehouse || !engineerWarehouse) return;
    const quantity = Number(requestQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setRequestError('数量不正确');
      return;
    }
    setRequesting(true);
    setRequestError('');
    try {
      await apiPost('/parts-requests', {
        type: 'PRE_PICK',
        fromWarehouseId: outletWarehouse.id,
        toWarehouseId: engineerWarehouse.id,
        items: [{
          partId: selectedItem.partId,
          partNo: selectedItem.partNo,
          partName: selectedItem.partName,
          partModel: selectedItem.partModel,
          quantity,
        }],
      });
      setSelectedItem(null);
      setRequestQty('1');
      await load();
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : '申请失败');
    } finally {
      setRequesting(false);
    }
  };
  void submitPartsRequest;

  return (
    <Shell active="inventory">
      <section className="mweb-section">
        <PageHeader title="库存总览" icon={Warehouse} onRefresh={load} />
        <SearchForm value={keyword} onChange={setKeyword} onSubmit={load} placeholder="搜索配件" />
        {error ? <div className="mweb-error">{error}</div> : null}
        {loading ? <div className="mweb-muted">加载中...</div> : null}
        {!loading && list.length === 0 ? <EmptyState text="暂无数据" /> : null}
        <div className="mweb-list">
          {list.map((item) => (
            <article className="mweb-data-card" key={item.id}>
              <div className="mweb-card-top">
                <strong>{item.partName}</strong>
                <span className={`mweb-chip ${item.quantityAvailable <= 0 ? 'danger' : item.quantityAvailable <= 2 ? 'warn' : 'success'}`}>可用 {item.quantityAvailable}</span>
              </div>
              <div className="mweb-data-grid">
                <span>型号：{item.partModel || '-'}</span>
                <span>仓库：{item.warehouseName || '-'}</span>
                <span>现存：{item.quantityOnHand}</span>
                <span>冻结：{item.quantityReserved}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Shell>
  );
}

function SearchForm({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  return (
    <form className="mweb-search-bar" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <Search size={17} />
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      <button className="mweb-primary small" type="submit">搜索</button>
    </form>
  );
}

function InventoryQuickPage() {
  const currentUser = getCachedUser();
  const [list, setList] = useState<InventoryBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Awaited<ReturnType<typeof getMyWarehouses>>>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryBalance | null>(null);
  const [requestQty, setRequestQty] = useState('1');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiGet<PaginatedResponse<InventoryBalance> | InventoryBalance[]>('/inventory/balances', {
        keyword,
        outletId: currentUser?.outletId || undefined,
        page: 1,
        pageSize: 50,
      }),
      getMyWarehouses(),
    ])
      .then(([res, ws]) => {
        const balances = Array.isArray(res) ? res : res.list || [];
        const outletWarehouses = ws.filter((warehouse) => warehouse.type === 'OUTLET_WAREHOUSE' && (currentUser?.outletId ? warehouse.outletId === currentUser.outletId : true));
        const scoped = outletWarehouses.length > 0
          ? balances.filter((item) => outletWarehouses.some((warehouse) => warehouse.id === item.warehouseId))
          : balances;
        setList(scoped);
        setWarehouses(ws);
        setError('');
      })
      .catch((err) => {
        setList([]);
        setWarehouses([]);
        setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => setLoading(false));
  }, [currentUser?.outletId, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const outletWarehouse = warehouses.find((warehouse) => warehouse.type === 'OUTLET_WAREHOUSE' && (currentUser?.outletId ? warehouse.outletId === currentUser.outletId : true));
  const engineerWarehouse = warehouses.find((warehouse) => warehouse.type === 'ENGINEER_WAREHOUSE' && warehouse.ownerEngineerId === currentUser?.id);
  const canRequest = Boolean(currentUser?.role === 'engineer' && outletWarehouse && engineerWarehouse);

  const submitPartsRequest = async () => {
    if (!selectedItem || !outletWarehouse || !engineerWarehouse) return;
    const quantity = Number(requestQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setRequestError('数量不正确');
      return;
    }
    setRequesting(true);
    setRequestError('');
    try {
      await apiPost('/parts-requests', {
        type: 'PRE_PICK',
        fromWarehouseId: outletWarehouse.id,
        toWarehouseId: engineerWarehouse.id,
        items: [{
          partId: selectedItem.partId,
          partNo: selectedItem.partNo,
          partName: selectedItem.partName,
          partModel: selectedItem.partModel,
          quantity,
        }],
      });
      setSelectedItem(null);
      setRequestQty('1');
      await load();
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : '申请失败');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Shell active="inventory">
      <section className="mweb-section">
        <PageHeader title="库存" icon={Warehouse} onRefresh={load} />
        <SearchForm value={keyword} onChange={setKeyword} onSubmit={load} placeholder="搜索配件" />
        {error ? <div className="mweb-error">{error}</div> : null}
        {loading ? <div className="mweb-muted">加载中...</div> : null}
        {!loading && list.length === 0 ? <EmptyState text="暂无数据" /> : null}

        <div className="mweb-list">
          {list.map((item) => (
            <article className="mweb-data-card" key={item.id}>
              <div className="mweb-card-top">
                <strong>{item.partName}</strong>
                <span className={`mweb-chip ${item.quantityAvailable <= 0 ? 'danger' : item.quantityAvailable <= 2 ? 'warn' : 'success'}`}>
                  可用 {item.quantityAvailable}
                </span>
              </div>
              <div className="mweb-data-grid">
                <span>型号：{item.partModel || '-'}</span>
                <span>仓库：{item.warehouseName || '-'}</span>
                <span>现存：{item.quantityOnHand}</span>
                <span>冻结：{item.quantityReserved}</span>
              </div>
              {canRequest ? (
                <button className="mweb-primary small" type="button" onClick={() => { setSelectedItem(item); setRequestQty('1'); }}>
                  快速申请领料
                </button>
              ) : null}
            </article>
          ))}
        </div>

        {selectedItem && canRequest ? (
          <div className="mweb-modal-backdrop">
            <div className="mweb-modal">
              <div className="mweb-section-head">
                <div className="mweb-title-row">
                  <div className="mweb-title-icon"><PackageSearch size={18} /></div>
                  <div>
                    <div className="mweb-section-title">快速领料</div>
                    <div className="mweb-section-sub">{selectedItem.partName}</div>
                  </div>
                </div>
                <button className="mweb-icon-btn" type="button" onClick={() => setSelectedItem(null)} aria-label="关闭">
                  <XCircle size={16} />
                </button>
              </div>
              <div className="mweb-form">
                <div className="mweb-data-grid">
                  <span>从：{outletWarehouse?.name || '-'}</span>
                  <span>到：{engineerWarehouse?.name || '-'}</span>
                  <span>配件：{selectedItem.partName}</span>
                </div>
                <label>
                  数量
                  <input type="number" min="1" value={requestQty} onChange={(event) => setRequestQty(event.target.value)} />
                </label>
                {requestError ? <div className="mweb-error">{requestError}</div> : null}
                <div className="mweb-modal-actions">
                  <button className="mweb-secondary" type="button" onClick={() => setSelectedItem(null)}>取消</button>
                  <button className="mweb-primary" type="button" disabled={requesting} onClick={submitPartsRequest}>
                    {requesting ? '提交中...' : '提交申请'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </Shell>
  );
}

void InventoryPage;

function InventoryHierarchyPage() {
  const currentUser = getCachedUser();
  const [view, setView] = useState<'overview' | 'outlets' | 'personal' | 'flow'>('overview');
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Awaited<ReturnType<typeof getMyWarehouses>>>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryBalance | null>(null);
  const [requestQty, setRequestQty] = useState('1');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiGet<PaginatedResponse<InventoryBalance> | InventoryBalance[]>('/inventory/balances', {
        keyword,
        page: 1,
        pageSize: 200,
      }),
      getMyWarehouses(),
    ])
      .then(([res, ws]) => {
        setBalances(Array.isArray(res) ? res : res.list || []);
        setWarehouses(ws);
        setError('');
      })
      .catch((err) => {
        setBalances([]);
        setWarehouses([]);
        setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => setLoading(false));
  }, [keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const warehouseById = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse])), [warehouses]);

  const qty = (items: InventoryBalance[]) => items.reduce((sum, item) => sum + item.quantityAvailable, 0);
  const hqWarehouseIds = warehouses.filter((warehouse) => warehouse.type === 'HQ_WAREHOUSE').map((warehouse) => warehouse.id);
  const outletWarehouses = warehouses.filter((warehouse) => warehouse.type === 'OUTLET_WAREHOUSE');
  const personalWarehouses = warehouses.filter((warehouse) => warehouse.type === 'ENGINEER_WAREHOUSE');
  const hqBalances = balances.filter((item) => hqWarehouseIds.includes(item.warehouseId));
  const outletBalances = balances.filter((item) => warehouseById.get(item.warehouseId)?.type === 'OUTLET_WAREHOUSE');
  const personalBalances = balances.filter((item) => warehouseById.get(item.warehouseId)?.type === 'ENGINEER_WAREHOUSE');
  const lowStockCount = balances.filter((item) => item.quantityAvailable <= 2).length;

  const outletGroups = useMemo(() => {
    return outletWarehouses.map((outletWarehouse) => {
      const outletId = outletWarehouse.outletId;
      const outletPersonalWarehouses = personalWarehouses.filter((warehouse) => warehouse.outletId === outletId || warehouse.ownerOutletIdSnapshot === outletId);
      const warehouseIds = [outletWarehouse.id, ...outletPersonalWarehouses.map((warehouse) => warehouse.id)];
      const groupBalances = balances.filter((item) => warehouseIds.includes(item.warehouseId));
      const outletOnlyBalances = balances.filter((item) => item.warehouseId === outletWarehouse.id);
      const engineerGroups = outletPersonalWarehouses.map((warehouse) => ({
        warehouse,
        balances: balances.filter((item) => item.warehouseId === warehouse.id),
      }));

      return {
        outletId,
        outletName: outletWarehouse.outletName || outletWarehouse.name,
        outletWarehouse,
        outletOnlyBalances,
        engineerGroups,
        totalAvailable: qty(groupBalances),
        outletAvailable: qty(outletOnlyBalances),
        personalAvailable: qty(groupBalances) - qty(outletOnlyBalances),
      };
    });
  }, [balances, outletWarehouses, personalWarehouses]);

  const myOutletWarehouse = outletWarehouses.find((warehouse) => currentUser?.outletId ? warehouse.outletId === currentUser.outletId : true);
  const myPersonalWarehouse = personalWarehouses.find((warehouse) => warehouse.ownerEngineerId === currentUser?.id);
  const canRequest = Boolean(currentUser?.role === 'engineer' && myOutletWarehouse && myPersonalWarehouse);
  const requestableBalances = myOutletWarehouse ? balances.filter((item) => item.warehouseId === myOutletWarehouse.id) : outletBalances;

  const submitPartsRequest = async () => {
    if (!selectedItem || !myOutletWarehouse || !myPersonalWarehouse) return;
    const quantity = Number(requestQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setRequestError('数量不正确');
      return;
    }
    setRequesting(true);
    setRequestError('');
    try {
      await apiPost('/parts-requests', {
        type: 'PRE_PICK',
        fromWarehouseId: myOutletWarehouse.id,
        toWarehouseId: myPersonalWarehouse.id,
        items: [{
          partId: selectedItem.partId,
          partNo: selectedItem.partNo,
          partName: selectedItem.partName,
          partModel: selectedItem.partModel,
          quantity,
        }],
      });
      setSelectedItem(null);
      setRequestQty('1');
      await load();
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : '申请失败');
    } finally {
      setRequesting(false);
    }
  };

  const renderBalanceRows = (items: InventoryBalance[]) => (
    <div className="mweb-list">
      {items.slice(0, 5).map((item) => (
        <article className="mweb-data-card" key={item.id}>
          <div className="mweb-card-top">
            <strong>{item.partName}</strong>
            <span className={`mweb-chip ${item.quantityAvailable <= 0 ? 'danger' : item.quantityAvailable <= 2 ? 'warn' : 'success'}`}>可用 {item.quantityAvailable}</span>
          </div>
          <div className="mweb-data-grid">
            <span>型号：{item.partModel || '-'}</span>
            <span>仓库：{item.warehouseName || '-'}</span>
            <span>现存：{item.quantityOnHand}</span>
            <span>冻结：{item.quantityReserved}</span>
          </div>
          {canRequest && item.warehouseId === myOutletWarehouse?.id ? (
            <button className="mweb-primary small" type="button" onClick={() => { setSelectedItem(item); setRequestQty('1'); }}>
              快速领料
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );

  return (
    <Shell active="inventory">
      <section className="mweb-section">
        <PageHeader title="库存" icon={Warehouse} onRefresh={load} />
        <SearchForm value={keyword} onChange={setKeyword} onSubmit={load} placeholder="搜索配件" />

        <div className="mweb-tab-row">
          {[
            ['overview', '总览'],
            ['outlets', '网点'],
            ['personal', '个人仓'],
            ['flow', '流水'],
          ].map(([key, label]) => (
            <button key={key} type="button" className={`mweb-tab ${view === key ? 'active' : ''}`} onClick={() => setView(key as typeof view)}>
              {label}
            </button>
          ))}
        </div>

        {error ? <div className="mweb-error">{error}</div> : null}
        {loading ? <div className="mweb-muted">加载中...</div> : null}

        {!loading && view === 'overview' ? (
          <>
            <section className="mweb-stats">
              <article className="mweb-stat"><span>总仓</span><strong>{qty(hqBalances)}</strong><em>K3</em></article>
              <article className="mweb-stat"><span>网点总和</span><strong>{qty(outletBalances) + qty(personalBalances)}</strong><em>网点+个人</em></article>
              <article className="mweb-stat"><span>个人仓</span><strong>{qty(personalBalances)}</strong><em>透明领料</em></article>
              <article className="mweb-stat"><span>低库存</span><strong>{lowStockCount}</strong><em>预警</em></article>
            </section>

            <div className="mweb-list">
              {outletGroups.map((group) => (
                <article className="mweb-data-card" key={group.outletWarehouse.id}>
                  <div className="mweb-card-top">
                    <strong>{group.outletName}</strong>
                    <span className="mweb-chip accent">总和 {group.totalAvailable}</span>
                  </div>
                  <div className="mweb-data-grid">
                    <span>网点仓：{group.outletAvailable}</span>
                    <span>个人仓：{group.personalAvailable}</span>
                    <span>工程师仓：{group.engineerGroups.length}</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}

        {!loading && view === 'outlets' ? (
          <div className="mweb-list">
            {outletGroups.map((group) => (
              <article className="mweb-data-card" key={group.outletWarehouse.id}>
                <div className="mweb-card-top">
                  <strong>{group.outletName}</strong>
                  <span className="mweb-chip accent">总和 {group.totalAvailable}</span>
                </div>
                <div className="mweb-data-grid">
                  <span>网点仓：{group.outletAvailable}</span>
                  <span>个人仓：{group.personalAvailable}</span>
                </div>
                {renderBalanceRows(group.outletOnlyBalances)}
                {group.engineerGroups.map((engineer) => (
                  <div className="mweb-block" key={engineer.warehouse.id}>
                    <div className="mweb-block-label">{engineer.warehouse.ownerEngineerName || engineer.warehouse.name}</div>
                    <div className="mweb-block-value">个人仓可用：{qty(engineer.balances)}</div>
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : null}

        {!loading && view === 'personal' ? (
          <div className="mweb-list">
            {personalWarehouses.map((warehouse) => {
              const items = balances.filter((item) => item.warehouseId === warehouse.id);
              return (
                <article className="mweb-data-card" key={warehouse.id}>
                  <div className="mweb-card-top">
                    <strong>{warehouse.ownerEngineerName || warehouse.name}</strong>
                    <span className="mweb-chip success">可用 {qty(items)}</span>
                  </div>
                  <div className="mweb-data-grid">
                    <span>所属网点：{warehouse.outletName || '-'}</span>
                    <span>仓库：{warehouse.name}</span>
                  </div>
                  {renderBalanceRows(items)}
                </article>
              );
            })}
          </div>
        ) : null}

        {!loading && view === 'flow' ? (
          <div className="mweb-list">
            {canRequest ? renderBalanceRows(requestableBalances) : <EmptyState text="请选择配件发起领料" />}
          </div>
        ) : null}

        {selectedItem && canRequest ? (
          <div className="mweb-modal-backdrop">
            <div className="mweb-modal">
              <div className="mweb-section-head">
                <div className="mweb-title-row">
                  <div className="mweb-title-icon"><PackageSearch size={18} /></div>
                  <div>
                    <div className="mweb-section-title">快速领料</div>
                    <div className="mweb-section-sub">{selectedItem.partName}</div>
                  </div>
                </div>
                <button className="mweb-icon-btn" type="button" onClick={() => setSelectedItem(null)} aria-label="关闭">
                  <XCircle size={16} />
                </button>
              </div>
              <div className="mweb-form">
                <div className="mweb-data-grid">
                  <span>从：{myOutletWarehouse?.name || '-'}</span>
                  <span>到：{myPersonalWarehouse?.name || '-'}</span>
                  <span>配件：{selectedItem.partName}</span>
                </div>
                <label>
                  数量
                  <input type="number" min="1" value={requestQty} onChange={(event) => setRequestQty(event.target.value)} />
                </label>
                {requestError ? <div className="mweb-error">{requestError}</div> : null}
                <div className="mweb-modal-actions">
                  <button className="mweb-secondary" type="button" onClick={() => setSelectedItem(null)}>取消</button>
                  <button className="mweb-primary" type="button" disabled={requesting} onClick={submitPartsRequest}>
                    {requesting ? '提交中...' : '提交申请'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </Shell>
  );
}

void InventoryQuickPage;

function ApprovalPage() {
  const [tab, setTab] = useState<'pending' | 'resolved' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<ApprovalType | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getApprovals({
      tab,
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      page: 1,
      pageSize: 20,
    })
      .then((res) => {
        setItems(res.list || []);
        setTotal(res.total || 0);
        setError('');
      })
      .catch((err) => {
        setItems([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => setLoading(false));
  }, [statusFilter, tab, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (item: ApprovalItem) => {
    try {
      if (item.type === 'WORK_ORDER_ESCALATION') {
        await approveEscalation(item.sourceId);
      } else {
        await approveApproval(item.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '审批失败');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await rejectApproval(rejectTarget.id, rejectReason || '驳回');
      setRejectTarget(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '驳回失败');
    }
  };

  const typeTabs = [
    ['', '全部'],
    ['PARTS_REQUEST', '领料'],
    ['PARTS_RETURN', '退库'],
    ['QUOTE', '报价'],
    ['WORK_ORDER_ESCALATION', '升级'],
  ] as const;

  const statusTabs = [
    ['', '全部状态'],
    ['PENDING', '待审批'],
    ['APPROVED', '已通过'],
    ['REJECTED', '已驳回'],
  ] as const;
  const approvalStatusLabel = (status: string) => status === 'PENDING' ? '待审批' : status === 'APPROVED' ? '已通过' : status === 'REJECTED' ? '已驳回' : status;

  return (
    <Shell active="approvals">
      <section className="mweb-section">
        <PageHeader title="审批中心" subtitle="待审事项" icon={CheckCircle} onRefresh={load} />

        <div className="mweb-quick-grid">
          {[
            { title: '待审批', text: '当前处理', active: tab === 'pending', onClick: () => setTab('pending') },
            { title: '已审批', text: '处理记录', active: tab === 'resolved', onClick: () => setTab('resolved') },
            { title: '全部', text: '所有记录', active: tab === 'all', onClick: () => setTab('all') },
          ].map((item) => (
            <button key={item.title} type="button" className={`mweb-quick-card ${item.active ? 'active' : ''}`} onClick={item.onClick}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </button>
          ))}
        </div>

        <div className="mweb-tab-row">
          {typeTabs.map(([value, label]) => (
            <button key={value || 'type-all'} type="button" className={`mweb-tab ${typeFilter === value ? 'active' : ''}`} onClick={() => setTypeFilter(value)}>
              {label}
            </button>
          ))}
        </div>

        <div className="mweb-tab-row">
          {statusTabs.map(([value, label]) => (
            <button key={value || 'status-all'} type="button" className={`mweb-tab ${statusFilter === value ? 'active' : ''}`} onClick={() => setStatusFilter(value)}>
              {label}
            </button>
          ))}
        </div>

        {error ? <div className="mweb-error">{error}</div> : null}
        {loading ? <div className="mweb-muted">加载中...</div> : null}
        {!loading && items.length === 0 ? <EmptyState text="暂无数据" /> : null}
        {!loading ? <div className="mweb-muted">共 {total} 条</div> : null}

        <div className="mweb-list">
          {items.map((item) => (
            <article className="mweb-data-card" key={item.id}>
              <div className="mweb-card-top">
                <strong>{item.sourceNo}</strong>
                <span className={`mweb-chip ${item.status === 'PENDING' ? 'warn' : item.status === 'APPROVED' ? 'success' : 'danger'}`}>{approvalStatusLabel(item.status)}</span>
              </div>
              <div className="mweb-data-grid">
                <span>类型：{item.type}</span>
                <span>申请人：{item.applicantName}</span>
                <span>摘要：{item.summary}</span>
                <span>时间：{item.createdAt.replace('T', ' ').slice(0, 16)}</span>
              </div>
              {item.status === 'PENDING' ? (
                <div className="mweb-modal-actions">
                  <button className="mweb-primary" type="button" onClick={() => handleApprove(item)}>通过</button>
                  <button className="mweb-secondary" type="button" onClick={() => setRejectTarget(item)}>驳回</button>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {rejectTarget ? (
          <div className="mweb-modal-backdrop">
            <div className="mweb-modal">
              <div className="mweb-section-head">
                <div className="mweb-title-row">
                  <div className="mweb-title-icon"><AlertTriangle size={18} /></div>
                  <div>
                    <div className="mweb-section-title">驳回审批</div>
                    <div className="mweb-section-sub">{rejectTarget.sourceNo}</div>
                  </div>
                </div>
                <button className="mweb-icon-btn" type="button" onClick={() => setRejectTarget(null)} aria-label="关闭">
                  <XCircle size={16} />
                </button>
              </div>
              <div className="mweb-form">
                <label>
                  驳回原因
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="请输入驳回原因" />
                </label>
                <div className="mweb-modal-actions">
                  <button className="mweb-secondary" type="button" onClick={() => setRejectTarget(null)}>取消</button>
                  <button className="mweb-primary" type="button" onClick={handleReject} disabled={!rejectReason.trim()}>确认驳回</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </Shell>
  );
}

function WorkflowPage() {
  const cards = [
    { icon: FileText, title: '统一表单', text: '同一套表单。' },
    { icon: ShieldCheck, title: '权限隔离', text: '按权限显示。' },
    { icon: Truck, title: '三包判断', text: '按时长和日期判断。' },
    { icon: PackageSearch, title: '库存流转', text: '按仓库流转。' },
  ];

  return (
    <Shell active="approvals">
      <section className="mweb-section">
        <PageHeader title="流程模型" subtitle="共享流程" icon={Workflow} />
        <div className="mweb-flow-grid">
          {cards.map(({ icon: Icon, title, text }) => (
            <article className="mweb-flow-card" key={title}>
              <Icon size={20} />
              <strong>{title}</strong>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>
    </Shell>
  );
}

const _legacyWorkflowPage = WorkflowPage;
void _legacyWorkflowPage;

function ProfilePage() {
  const navigate = useNavigate();
  const user = getCachedUser();

  return (
    <Shell active="profile">
      <section className="mweb-section">
        <PageHeader title="我的" icon={UserCircle2} />
        <div className="mweb-profile-card">
          <div className="mweb-profile-avatar">{(user?.name || user?.username || 'U')[0]}</div>
          <div>
            <div className="mweb-profile-name">{user?.name || user?.username || '未登录'}</div>
            <div className="mweb-profile-sub">{user?.role || '-'}</div>
          </div>
        </div>
        <button className="mweb-ghost-btn" type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }}>退出登录</button>
      </section>
    </Shell>
  );
}

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthGate><DashboardPage /></AuthGate>} />
        <Route path="/orders" element={<AuthGate><OrderListPage /></AuthGate>} />
        <Route path="/orders/:id" element={<AuthGate><OrderDetailPage /></AuthGate>} />
        <Route path="/assets" element={<AuthGate><AssetsPage /></AuthGate>} />
        <Route path="/customers" element={<AuthGate><CustomersPage /></AuthGate>} />
        <Route path="/machines" element={<AuthGate><MachinesPage /></AuthGate>} />
        <Route path="/inventory" element={<AuthGate><InventoryHierarchyPage /></AuthGate>} />
        <Route path="/approvals" element={<AuthGate><ApprovalPage /></AuthGate>} />
        <Route path="/workflow" element={<Navigate to="/approvals" replace />} />
        <Route path="/profile" element={<AuthGate><ProfilePage /></AuthGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

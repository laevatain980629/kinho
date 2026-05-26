import { useLocation, Link } from 'react-router';
import { DisclosureGroup, Disclosure } from '@heroui/react';
import {
  LayoutDashboard, ClipboardList, Inbox, List,
  Settings, Building2, Users, Truck, AlertTriangle,
  Package, DollarSign, ShoppingCart, Warehouse,
  Building, BarChart3, PackagePlus, PackageMinus,
  CheckCircle, PieChart, Shield, UserCog, Key, FileText, ArrowLeftRight,
  ChevronRight, ChevronLeft, type LucideIcon,
} from 'lucide-react';
import { usePermissions } from '@kinho/shared-components';

interface ChildItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  permissions: string[];
}

interface MenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  permissions: string[];
  path?: string;
  children?: ChildItem[];
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'dashboard', label: '工作台', icon: LayoutDashboard, path: '/dashboard', permissions: ['menu:dashboard'] },
  {
    key: 'work-order', label: '工单中心', icon: ClipboardList, permissions: ['menu:work_order'],
    children: [
      { key: 'reception', label: '报修受理池', path: '/work-orders/reception', icon: Inbox, permissions: ['work_order:accept'] },
      { key: 'list', label: '工单列表', path: '/work-orders', icon: List, permissions: ['work_order:view'] },
    ],
  },
  {
    key: 'asset', label: '资产管理', icon: Settings, permissions: ['menu:asset'],
    children: [
      { key: 'outlet', label: '网点管理', path: '/outlets', icon: Building2, permissions: ['outlet:view'] },
      { key: 'customer', label: '客户管理', path: '/customers', icon: Users, permissions: ['customer:view'] },
      { key: 'machine', label: '机台管理', path: '/machines', icon: Truck, permissions: ['machine:view'] },
      { key: 'fault-type', label: '故障分类', path: '/fault-types', icon: AlertTriangle, permissions: ['fault_type:view'] },
      { key: 'part', label: '配件管理', path: '/parts', icon: Package, permissions: ['parts:view'] },
    ],
  },
  { key: 'quote', label: '报价管理', icon: DollarSign, path: '/quotes', permissions: ['menu:quote'] },
  { key: 'procurement', label: '采购管理', icon: ShoppingCart, path: '/procurements', permissions: ['menu:procurement'] },
  {
    key: 'warehouse', label: '仓库/领料', icon: Warehouse, permissions: ['menu:warehouse', 'menu:inventory', 'menu:parts_request', 'menu:parts_return'],
    children: [
      { key: 'warehouses', label: '仓库管理', path: '/warehouses', icon: Building, permissions: ['menu:warehouse'] },
      { key: 'overview', label: '库存总览', path: '/warehouse', icon: BarChart3, permissions: ['menu:inventory'] },
      { key: 'transfer', label: '调拨管理', path: '/warehouses/transfer', icon: ArrowLeftRight, permissions: ['warehouse:transfer'] },
      { key: 'parts', label: '领料管理', path: '/parts-requests', icon: PackagePlus, permissions: ['menu:parts_request'] },
      { key: 'return', label: '退库管理', path: '/parts-returns', icon: PackageMinus, permissions: ['menu:parts_return'] },
    ],
  },
  { key: 'approval', label: '审批中心', icon: CheckCircle, path: '/approvals', permissions: ['menu:approval'] },
  { key: 'report', label: '报表', icon: PieChart, path: '/reports', permissions: ['menu:report'] },
  {
    key: 'system', label: '系统管理', icon: Shield, permissions: ['menu:system'],
    children: [
      { key: 'user', label: '用户管理', path: '/users', icon: UserCog, permissions: ['system:user_manage'] },
      { key: 'role', label: '角色权限', path: '/roles', icon: Key, permissions: ['system:role_manage'] },
      { key: 'audit', label: '审计日志', path: '/audit-logs', icon: FileText, permissions: ['menu:audit', 'system:audit_log'] },
    ],
  },
];

function isChildActive(childPath: string, pathname: string): boolean {
  if (childPath === '/work-orders') return pathname === '/work-orders' || (pathname.startsWith('/work-orders/') && !pathname.startsWith('/work-orders/reception'));
  if (childPath === '/warehouses') return pathname === '/warehouses' || /^\/warehouses\/\d+$/.test(pathname);
  if (childPath === '/dashboard') return pathname === '/dashboard';
  return pathname === childPath || pathname.startsWith(childPath + '/');
}

function isGroupActive(children: { path: string }[], pathname: string): boolean {
  return children.some((c) => isChildActive(c.path, pathname));
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { hasAny, loading } = usePermissions();

  const visibleItems = MENU_ITEMS
    .filter((item) => hasAny(item.permissions))
    .map((item) => item.children ? { ...item, children: item.children.filter((child) => hasAny(child.permissions)) } : item)
    .filter((item) => !item.children || item.children.length > 0);

  const expandedKeys = visibleItems
    .filter((item) => item.children && isGroupActive(item.children, location.pathname))
    .map((item) => item.key);

  if (loading) return null;

  return (
    <aside className={`fixed left-0 top-0 bottom-0 z-30 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-200 ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}>
      <div className="flex h-14 items-center gap-3 border-b border-[var(--border)] px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--accent), oklch(0.55 0.2 285))' }}>
          MG
        </div>
        {!collapsed && <span className="truncate text-[15px] font-semibold text-[var(--foreground)]">Machinery Guard</span>}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {collapsed ? (
          visibleItems.map((item) => {
            const Icon = item.icon;
            const targetPath = item.path || item.children?.[0]?.path || '#';
            const isActive = item.children ? isGroupActive(item.children, location.pathname) : isChildActive(item.path || '', location.pathname);
            return (
              <Link key={item.key} to={targetPath} title={item.label}
                className={`group relative mb-1 flex items-center justify-center rounded-lg py-2.5 transition-colors ${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]'}`}>
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--accent)]" />}
                <Icon size={20} className="shrink-0" />
              </Link>
            );
          })
        ) : (
          <DisclosureGroup defaultExpandedKeys={expandedKeys} className="flex flex-col gap-0.5">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              if (!item.children) {
                const isActive = isChildActive(item.path || '', location.pathname);
                return (
                  <Link key={item.key} to={item.path || '#'}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]'}`}>
                    <Icon size={20} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              }
              const groupIsActive = isGroupActive(item.children, location.pathname);
              return (
                <Disclosure key={item.key} id={item.key}>
                  <Disclosure.Heading>
                    <Disclosure.Trigger
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${groupIsActive ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]'}`}>
                      <Icon size={20} className="shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <Disclosure.Indicator>
                        <ChevronRight size={14} className="shrink-0 text-[var(--muted)] transition-transform duration-200 group-data-[expanded]:rotate-90" />
                      </Disclosure.Indicator>
                    </Disclosure.Trigger>
                  </Disclosure.Heading>
                  <Disclosure.Content>
                    <div className="ml-4 border-l border-[var(--border)] pl-3 pt-1 pb-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isActive = isChildActive(child.path, location.pathname);
                        return (
                          <Link key={child.key} to={child.path}
                            className={`relative mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]'}`}>
                            <ChildIcon size={16} className="shrink-0" />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </Disclosure.Content>
                </Disclosure>
              );
            })}
          </DisclosureGroup>
        )}
      </nav>

      <button onClick={onToggle} className="flex h-11 items-center justify-center border-t border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]" title={collapsed ? '展开侧边栏' : '收起侧边栏'}>
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}

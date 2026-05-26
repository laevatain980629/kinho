import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, Table, Chip, Button, SearchField, Pagination } from '@heroui/react';
import { ClipboardList, Plus, Eye } from 'lucide-react';
import { EmptyView, LoadingView, ErrorView } from '@kinho/shared-components';
import type { WorkOrderListItem } from '@kinho/shared-types';
import { WORK_ORDER_STATE_LABELS, WORK_ORDER_PRIORITY_LABELS } from '@kinho/shared-types';
import { getWorkOrders, createWorkOrder, getWorkOrderStats } from '@/services/work-order';
import WorkOrderForm from '@/components/forms/WorkOrderForm';

const STATE_FILTERS = [
  { key: '', label: '全部' },
  { key: 'CREATED', label: '已创建' },
  { key: 'REPAIRING', label: '维修中' },
  { key: 'FOLLOW_UP_PENDING', label: '待回访' },
  { key: 'CLOSED', label: '已关闭' },
];

const STATE_COLORS: Record<string, 'accent' | 'warning' | 'default' | 'success' | 'danger'> = {
  CREATED: 'accent',
  ACCEPTED: 'accent',
  OUTLET_ASSIGNED: 'accent',
  ENGINEER_ASSIGNED: 'accent',
  SIGNED_IN: 'default',
  FAULT_CONFIRMED: 'default',
  REPAIRING: 'warning',
  PENDING_SIGNATURE: 'default',
  REPAIR_COMPLETED: 'success',
  FOLLOW_UP_PENDING: 'accent',
  CLOSED: 'success',
  CANCELLED: 'danger',
};

const PRIORITY_COLORS: Record<string, 'danger' | 'warning' | 'default'> = {
  URGENT: 'danger',
  CRITICAL: 'danger',
  NORMAL: 'default',
};

const PAGE_SIZE = 20;

const EMPTY_STATS = {
  pending: 0,
  repairing: 0,
  pendingSignature: 0,
  monthCompleted: 0,
};

export default function WorkOrderList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<WorkOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '');
  const [priorityFilter] = useState(searchParams.get('priority') || '');
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sync filter changes to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (stateFilter) params.state = stateFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (keyword) params.keyword = keyword;
    setSearchParams(params, { replace: true });
  }, [stateFilter, priorityFilter, keyword]);

  const fetchOrders = () => {
    setLoading(true);
    setError('');
    getWorkOrders({ page, pageSize: PAGE_SIZE, keyword, state: stateFilter || undefined, priority: priorityFilter || undefined })
      .then((res) => {
        setOrders(res.list);
        setTotal(res.total);
      })
      .catch((err) => {
        setError(err?.message || '加载失败');
        setOrders([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    getWorkOrderStats()
      .then(setStats)
      .catch(() => setStats(EMPTY_STATS));
  };

  useEffect(() => {
    fetchOrders();
  }, [page, keyword, stateFilter, priorityFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
          <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">工单管理</h1>
          <p className="text-xs text-[var(--muted)]">查看和管理所有维修工单</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '待处理', value: stats.pending, color: 'var(--accent)', bg: 'bg-[var(--accent)]/5' },
          { label: '维修中', value: stats.repairing, color: 'var(--warning)', bg: 'bg-[var(--warning)]/5' },
          { label: '待签名', value: stats.pendingSignature, color: '#8b5cf6', bg: 'bg-[#8b5cf6]/5' },
          { label: '本月完成', value: stats.monthCompleted, color: 'var(--success)', bg: 'bg-[var(--success)]/5' },
        ].map((s) => (
          <Card key={s.label} className={`border-0 ${s.bg}`}>
            <Card.Content className="p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[var(--muted)]">{s.label}</div>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Toolbar: Filters + Create */}
      <div className="flex items-center gap-3">
        {/* State tabs */}
        <div className="flex gap-1">
          {STATE_FILTERS.map(({ key, label }) => (
            <Button
              key={key}
              variant={stateFilter === key ? 'primary' : 'ghost'}
              size="sm"
              className="text-xs"
              onPress={() => { setStateFilter(key); setPage(1); }}
            >
              {label}
            </Button>
          ))}
        </div>

        <SearchField
          value={keyword}
          onChange={setKeyword}
          className="w-56"
        />

        <div className="flex-1" />

        <Button data-testid="work-order-create-open" variant="primary" size="sm" onPress={() => setCreateFormOpen(true)}>
          <Plus className="size-4" />
          新建工单
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <LoadingView skeleton skeletonRows={8} />
          ) : error ? (
            <ErrorView error={error} onRetry={fetchOrders} />
          ) : (
            <Table>
              <Table.ScrollContainer>
              <Table.Content aria-label="工单列表">
              <Table.Header>
                <Table.Column isRowHeader>工单编号 / 标题</Table.Column>
                <Table.Column>状态</Table.Column>
                <Table.Column>网点</Table.Column>
                <Table.Column>优先级</Table.Column>
                <Table.Column>创建时间</Table.Column>
                <Table.Column>{/* 操作 */}</Table.Column>
              </Table.Header>
              <Table.Body
                items={orders}
                renderEmptyState={() => (
                  <EmptyView
                    title="暂无工单"
                    description={stateFilter ? '当前筛选条件下没有匹配的工单' : '还没有任何工单，点击上方按钮创建'}
                    actionLabel={stateFilter ? '清除筛选' : undefined}
                    onAction={stateFilter ? () => setStateFilter('') : undefined}
                  />
                )}
              >
                {(order) => (
                  <Table.Row key={order.id}>
                    <Table.Cell>
                      <div className="font-medium">{order.orderNo}</div>
                      <div className="mt-0.5 text-xs text-[var(--muted)]">{order.title}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip color={STATE_COLORS[order.state] || 'default'} variant="primary" size="sm">
                        {WORK_ORDER_STATE_LABELS[order.state]}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="text-sm">{order.outletName || '—'}</Table.Cell>
                    <Table.Cell>
                      <Chip color={PRIORITY_COLORS[order.priority] || 'default'} variant="primary" size="sm">
                        {WORK_ORDER_PRIORITY_LABELS[order.priority]}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="text-sm text-[var(--muted)]">
                      {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => navigate(`/work-orders/${order.id}`)}
                      >
                        <Eye className="size-3.5" />
                        详情
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
              </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Card.Content>
      </Card>

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--muted)]">
            共 {total} 条，第 {page}/{totalPages} 页
          </span>
          {totalPages > 1 && (
            <Pagination>
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    isDisabled={page === 1}
                  >上一页</Pagination.Previous>
                </Pagination.Item>
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <Pagination.Item key={pageNum}>
                      <Pagination.Link
                        isActive={page === pageNum}
                        onPress={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Pagination.Link>
                    </Pagination.Item>
                  );
                })}
                <Pagination.Item>
                  <Pagination.Next
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    isDisabled={page >= totalPages}
                  >下一页</Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          )}
        </div>
      )}

      <WorkOrderForm
        open={createFormOpen}
        onClose={() => setCreateFormOpen(false)}
        onSubmit={async (data) => {
          try {
            await createWorkOrder({ ...data, priority: data.priority || 'NORMAL' });
            setCreateFormOpen(false);
            fetchStats();
            fetchOrders();
          } catch { /* ignore */ }
        }}
      />
    </div>
  );
}

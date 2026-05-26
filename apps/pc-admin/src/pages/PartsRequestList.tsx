import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, Table, Chip, Button, SearchField, Select, ListBox } from '@heroui/react';
import { PackagePlus, Eye } from 'lucide-react';
import { LoadingView } from '@kinho/shared-components';
import type { PartsRequest } from '@kinho/shared-types';
import { PARTS_REQUEST_STATUS_LABELS, PARTS_REQUEST_STATUS_COLORS, PARTS_REQUEST_TYPE_LABELS } from '@kinho/shared-types';
import { getPartsRequests } from '@/services/parts-request';

const TYPE_OPTIONS = [
  { key: '', label: '全部类型' },
  { key: 'PRE_PICK', label: '预领料' },
  { key: 'WORK_ORDER_PICK', label: '工单领料' },
  { key: 'ADDITIONAL_PICK', label: '追加领料' },
];

const STATUS_OPTIONS = [
  { key: '', label: '全部状态' },
  ...['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SHIPPED', 'RECEIVED', 'CANCELLED'].map(k => ({ key: k, label: PARTS_REQUEST_STATUS_LABELS[k as keyof typeof PARTS_REQUEST_STATUS_LABELS] || k })),
];

export default function PartsRequestList() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PartsRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    getPartsRequests({ keyword, type: typeFilter || undefined, status: statusFilter || undefined, page, pageSize: 20 })
      .then((res) => { setRequests(res.list); setTotal(res.total); })
      .catch(() => { setRequests([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [keyword, typeFilter, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-xl p-2.5" style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)' }}>
          <PackagePlus className="size-6" style={{ color: 'var(--warning)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">领料管理</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">管理领料申请，跟踪领料状态</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SearchField value={keyword} onChange={setKeyword} className="w-64" />
        <Select value={typeFilter} onChange={(v) => { setTypeFilter(String(v || '')); setPage(1); }} className="w-32">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {TYPE_OPTIONS.map(o => <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>)}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select value={statusFilter} onChange={(v) => { setStatusFilter(String(v || '')); setPage(1); }} className="w-32">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {STATUS_OPTIONS.map(o => <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>)}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <Card>
        <Card.Content className="p-0">
          {loading ? <LoadingView skeleton skeletonRows={8} /> : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="领料列表">
                  <Table.Header>
                    <Table.Column isRowHeader>领料单号</Table.Column>
                    <Table.Column isRowHeader>类型</Table.Column>
                    <Table.Column isRowHeader>关联工单</Table.Column>
                    <Table.Column isRowHeader>调出仓→调入仓</Table.Column>
                    <Table.Column isRowHeader>总数量</Table.Column>
                    <Table.Column isRowHeader>状态</Table.Column>
                    <Table.Column isRowHeader>创建人</Table.Column>
                    <Table.Column isRowHeader>创建时间</Table.Column>
                    <Table.Column isRowHeader>{/* 操作 */}</Table.Column>
                  </Table.Header>
                  <Table.Body items={requests}>
                    {(req) => (
                      <Table.Row key={req.id} className="cursor-pointer" onAction={() => navigate(`/parts-requests/${req.id}`)}>
                        <Table.Cell className="font-medium">{req.requestNo}</Table.Cell>
                        <Table.Cell><Chip color="default" variant="primary" size="sm">{PARTS_REQUEST_TYPE_LABELS[req.type]}</Chip></Table.Cell>
                        <Table.Cell>{req.workOrderNo || '—'}</Table.Cell>
                        <Table.Cell>{req.fromWarehouseName} → {req.toWarehouseName}</Table.Cell>
                        <Table.Cell>{req.totalQuantity}</Table.Cell>
                        <Table.Cell><Chip color={PARTS_REQUEST_STATUS_COLORS[req.status]} variant="primary" size="sm">{PARTS_REQUEST_STATUS_LABELS[req.status]}</Chip></Table.Cell>
                        <Table.Cell>{req.createdByName}</Table.Cell>
                        <Table.Cell className="text-[var(--muted)]">{new Date(req.createdAt).toLocaleDateString('zh-CN')}</Table.Cell>
                        <Table.Cell>
                          <Button variant="ghost" size="sm" onPress={() => navigate(`/parts-requests/${req.id}`)}><Eye className="size-4" />详情</Button>
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

      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span>共 {total} 条</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" isDisabled={page <= 1} onPress={() => setPage(page - 1)}>上一页</Button>
            <span className="rounded bg-[var(--accent)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-foreground)]">{page}/{totalPages}</span>
            <Button variant="ghost" size="sm" isDisabled={page >= totalPages} onPress={() => setPage(page + 1)}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
}

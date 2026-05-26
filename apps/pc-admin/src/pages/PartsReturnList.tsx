import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, Table, Chip, Button, SearchField, Select, ListBox } from '@heroui/react';
import { PackageMinus, Eye } from 'lucide-react';
import { LoadingView } from '@kinho/shared-components';
import type { PartsReturn } from '@kinho/shared-types';
import { PARTS_RETURN_STATUS_LABELS, PARTS_RETURN_STATUS_COLORS, RETURN_REASON_LABELS, QUALITY_RESULT_LABELS, QUALITY_RESULT_COLORS } from '@kinho/shared-types';
import { getPartsReturns } from '@/services/parts-return';

const STATUS_OPTIONS = [
  { key: '', label: '全部状态' },
  ...['PENDING', 'CONFIRMED', 'RECEIVED', 'REJECTED'].map(k => ({ key: k, label: PARTS_RETURN_STATUS_LABELS[k as keyof typeof PARTS_RETURN_STATUS_LABELS] || k })),
];

const REASON_OPTIONS = [
  { key: '', label: '全部原因' },
  { key: 'NOT_USED', label: '未使用' },
  { key: 'WRONG_PART', label: '带错配件' },
  { key: 'EXCESS', label: '多领' },
  { key: 'DAMAGED_RETURN', label: '损坏件退回' },
  { key: 'OLD_PART_RETURN', label: '旧件回收' },
  { key: 'OTHER', label: '其他' },
];

export default function PartsReturnList() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<PartsReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    getPartsReturns({ keyword, status: statusFilter || undefined, reason: reasonFilter || undefined, page, pageSize: 20 })
      .then((res) => { setReturns(res.list); setTotal(res.total); })
      .catch(() => { setReturns([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [keyword, statusFilter, reasonFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-xl p-2.5" style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 12%, transparent)' }}>
          <PackageMinus className="size-6" style={{ color: 'var(--danger)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">退库管理</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">管理退库申请，跟踪退库状态</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SearchField value={keyword} onChange={setKeyword} className="w-64" />
        <Select value={statusFilter} onChange={(v) => { setStatusFilter(String(v || '')); setPage(1); }} className="w-32">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {STATUS_OPTIONS.map(o => <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>)}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select value={reasonFilter} onChange={(v) => { setReasonFilter(String(v || '')); setPage(1); }} className="w-32">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {REASON_OPTIONS.map(o => <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>)}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <Card>
        <Card.Content className="p-0">
          {loading ? <LoadingView skeleton skeletonRows={8} /> : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="退库列表">
                  <Table.Header>
                    <Table.Column isRowHeader>退库单号</Table.Column>
                    <Table.Column isRowHeader>关联工单</Table.Column>
                    <Table.Column isRowHeader>退库原因</Table.Column>
                    <Table.Column isRowHeader>总数量</Table.Column>
                    <Table.Column isRowHeader>质检结果</Table.Column>
                    <Table.Column isRowHeader>状态</Table.Column>
                    <Table.Column isRowHeader>创建人</Table.Column>
                    <Table.Column isRowHeader>创建时间</Table.Column>
                    <Table.Column isRowHeader>{/* 操作 */}</Table.Column>
                  </Table.Header>
                  <Table.Body items={returns}>
                    {(ret) => (
                      <Table.Row key={ret.id} className="cursor-pointer" onAction={() => navigate(`/parts-returns/${ret.id}`)}>
                        <Table.Cell className="font-medium">{ret.returnNo}</Table.Cell>
                        <Table.Cell>{ret.workOrderNo}</Table.Cell>
                        <Table.Cell>{RETURN_REASON_LABELS[ret.reason]}</Table.Cell>
                        <Table.Cell>{ret.items.reduce((sum, i) => sum + i.quantity, 0)}</Table.Cell>
                        <Table.Cell>
                          {ret.items.length > 0 && ret.items[0].qualityResult && (
                            <Chip color={QUALITY_RESULT_COLORS[ret.items[0].qualityResult]} variant="primary" size="sm">
                              {QUALITY_RESULT_LABELS[ret.items[0].qualityResult]}
                            </Chip>
                          )}
                        </Table.Cell>
                        <Table.Cell><Chip color={PARTS_RETURN_STATUS_COLORS[ret.status]} variant="primary" size="sm">{PARTS_RETURN_STATUS_LABELS[ret.status]}</Chip></Table.Cell>
                        <Table.Cell>{ret.createdByName}</Table.Cell>
                        <Table.Cell className="text-[var(--muted)]">{new Date(ret.createdAt).toLocaleDateString('zh-CN')}</Table.Cell>
                        <Table.Cell>
                          <Button variant="ghost" size="sm" onPress={() => navigate(`/parts-returns/${ret.id}`)}><Eye className="size-4" />详情</Button>
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

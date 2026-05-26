import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, Table, Chip, Button, SearchField, Select, ListBox, Modal } from '@heroui/react';
import { ShoppingCart, Plus, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { LoadingView } from '@kinho/shared-components';
import type { ProcurementRequest } from '@kinho/shared-types';
import { PROCUREMENT_STATUS_LABELS, PROCUREMENT_STATUS_COLORS } from '@kinho/shared-types';
import { getProcurements, deleteProcurement } from '@/services/procurement';

const STATUS_OPTIONS = [
  { key: '', label: '全部状态' },
  ...Object.entries(PROCUREMENT_STATUS_LABELS).map(([k, v]) => ({ key: k, label: v })),
];

export default function ProcurementList() {
  const navigate = useNavigate();
  const [list, setList] = useState<ProcurementRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    getProcurements({ keyword, status: statusFilter || undefined, page, pageSize: 20 })
      .then((res) => { setList(res.list); setTotal(res.total); })
      .catch(() => { setList([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [keyword, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    await deleteProcurement(id);
    setDeleteId(null); fetchData();
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-xl p-2.5" style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)' }}>
          <ShoppingCart className="size-6" style={{ color: 'var(--warning)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">采购管理</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">管理采购申请，跟踪采购进度</p>
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
        <div className="flex-1" />
        <Button variant="primary" size="sm" onPress={() => navigate('/procurements/create')}><Plus className="size-4" />新建采购</Button>
      </div>

      <Card>
        <Card.Content className="p-0">
          {loading ? <LoadingView skeleton skeletonRows={8} /> : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="采购列表">
                  <Table.Header>
                    <Table.Column isRowHeader>采购单号</Table.Column>
                    <Table.Column isRowHeader>报价单号</Table.Column>
                    <Table.Column isRowHeader>工单编号</Table.Column>
                    <Table.Column isRowHeader>供应商</Table.Column>
                    <Table.Column isRowHeader>预估费用</Table.Column>
                    <Table.Column isRowHeader>状态</Table.Column>
                    <Table.Column isRowHeader>创建人</Table.Column>
                    <Table.Column isRowHeader>创建时间</Table.Column>
                    <Table.Column isRowHeader>{/* 操作 */}</Table.Column>
                  </Table.Header>
                  <Table.Body items={list}>
                    {(item) => (
                      <Table.Row key={item.id} className="cursor-pointer" onAction={() => navigate(`/procurements/${item.id}`)}>
                        <Table.Cell className="font-medium">{item.procurementNo}</Table.Cell>
                        <Table.Cell>{item.quoteNo || '—'}</Table.Cell>
                        <Table.Cell>{item.workOrderNo || '—'}</Table.Cell>
                        <Table.Cell>{item.supplierName}</Table.Cell>
                        <Table.Cell>¥{item.estimatedCost.toLocaleString()}</Table.Cell>
                        <Table.Cell><Chip color={PROCUREMENT_STATUS_COLORS[item.status]} variant="primary" size="sm">{PROCUREMENT_STATUS_LABELS[item.status]}</Chip></Table.Cell>
                        <Table.Cell>{item.createdByName}</Table.Cell>
                        <Table.Cell className="text-[var(--muted)]">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onPress={() => navigate(`/procurements/${item.id}`)}><Eye className="size-4" />详情</Button>
                            <Button variant="ghost" size="sm" onPress={() => setDeleteId(item.id)}><Trash2 className="size-4" />删除</Button>
                          </div>
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

      <Modal>
        <Modal.Backdrop isOpen={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Icon><AlertTriangle className="size-5 text-[var(--danger)]" /></Modal.Icon><Modal.Heading>确认删除</Modal.Heading></Modal.Header>
              <Modal.Body><p className="text-sm text-[var(--muted)]">删除后不可恢复，确定要删除该采购单吗？</p></Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button variant="danger" size="sm" onPress={() => handleDelete(deleteId!)}>确认删除</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

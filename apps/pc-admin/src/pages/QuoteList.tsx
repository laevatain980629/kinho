import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, Table, Chip, Button, SearchField, Select, ListBox, Modal } from '@heroui/react';
import { DollarSign, Plus, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { LoadingView } from '@kinho/shared-components';
import type { Quote } from '@kinho/shared-types';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@kinho/shared-types';
import { getQuotes, deleteQuote } from '@/services/quote';

const STATUS_OPTIONS = [
  { key: '', label: '全部状态' },
  { key: 'DRAFT', label: '草稿' },
  { key: 'PENDING_SUPERVISOR', label: '待主管审核' },
  { key: 'PENDING_PROCUREMENT', label: '待采购确认' },
  { key: 'PENDING_CUSTOMER_CONFIRM', label: '待客户确认' },
  { key: 'CUSTOMER_CONFIRMED', label: '已确认' },
  { key: 'REJECTED', label: '已驳回' },
];

export default function QuoteList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    getQuotes({ keyword, status: statusFilter || undefined, page, pageSize: 20 })
      .then((res) => { setQuotes(res.list); setTotal(res.total); })
      .catch(() => { setQuotes([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [keyword, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    await deleteQuote(id);
    setDeleteId(null); fetchData();
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-xl p-2.5 bg-[var(--accent)]/10">
          <DollarSign className="size-6 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">报价管理</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">管理所有报价单，跟踪报价状态</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SearchField value={keyword} onChange={setKeyword} className="w-64" />
        <Select value={statusFilter} onChange={(v) => { setStatusFilter(String(v || '')); setPage(1); }} className="w-36">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {STATUS_OPTIONS.map(o => <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>)}
            </ListBox>
          </Select.Popover>
        </Select>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onPress={() => navigate('/quotes/create')}><Plus className="size-4" />新建报价</Button>
      </div>

      <Card>
        <Card.Content className="p-0">
          {loading ? <LoadingView skeleton skeletonRows={8} /> : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="报价列表">
                  <Table.Header>
                    <Table.Column isRowHeader>报价单号</Table.Column>
                    <Table.Column isRowHeader>关联工单</Table.Column>
                    <Table.Column isRowHeader>总金额</Table.Column>
                    <Table.Column isRowHeader>状态</Table.Column>
                    <Table.Column isRowHeader>创建人</Table.Column>
                    <Table.Column isRowHeader>创建时间</Table.Column>
                    <Table.Column isRowHeader>{/* 操作 */}</Table.Column>
                  </Table.Header>
                  <Table.Body items={quotes}>
                    {(quote) => (
                      <Table.Row key={quote.id} className="cursor-pointer" onAction={() => navigate(`/quotes/${quote.id}`)}>
                        <Table.Cell className="font-medium">{quote.quoteNo}</Table.Cell>
                        <Table.Cell>{quote.workOrderNo}</Table.Cell>
                        <Table.Cell>¥{quote.totalAmount.toLocaleString()}</Table.Cell>
                        <Table.Cell><Chip color={QUOTE_STATUS_COLORS[quote.status]} variant="primary" size="sm">{QUOTE_STATUS_LABELS[quote.status]}</Chip></Table.Cell>
                        <Table.Cell>{quote.createdBy}</Table.Cell>
                        <Table.Cell className="text-[var(--muted)]">{new Date(quote.createdAt).toLocaleDateString('zh-CN')}</Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onPress={() => navigate(`/quotes/${quote.id}`)}><Eye className="size-4" />详情</Button>
                            <Button variant="ghost" size="sm" onPress={() => setDeleteId(quote.id)}><Trash2 className="size-4" />删除</Button>
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
              <Modal.Body><p className="text-sm text-[var(--muted)]">删除后不可恢复，确定要删除该报价单吗？</p></Modal.Body>
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

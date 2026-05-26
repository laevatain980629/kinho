import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Chip, Button, SearchField, Select, ListBox, Modal, TextField, Label, Input, Checkbox } from '@heroui/react';
import { Package, Plus, Edit2, Power } from 'lucide-react';
import { LoadingView, EmptyView } from '@kinho/shared-components';
import type { Part } from '@kinho/shared-types';
import { getParts, createPart, updatePart, togglePartEnabled } from '@/services/part';

export default function PartList() {
  const [parts, setParts] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories] = useState(['密封件', '滤芯', '管路', '电子元件', '液压件', '发动机件', '结构件', '其他']);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [form, setForm] = useState({ materialNo: '', name: '', model: '', unitPrice: '', unit: '个', categoryName: '', enabled: true });
  const fetchData = useCallback(() => {
    setLoading(true);
    getParts({ keyword, categoryId: categoryFilter ? 1 : undefined, page, pageSize: 20 })
      .then((res) => { setParts(res.list); setTotal(res.total); })
      .catch(() => { setParts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [keyword, categoryFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm({ materialNo: '', name: '', model: '', unitPrice: '', unit: '个', categoryName: '', enabled: true }); setModalOpen(true); };
  const openEdit = (p: Part) => { setEditing(p); setForm({ materialNo: p.materialNo, name: p.name, model: p.model, unitPrice: String(p.unitPrice), unit: p.unit, categoryName: p.categoryName, enabled: p.enabled }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.materialNo || !form.name || !form.model || !form.unitPrice) return;
    const payload = { materialNo: form.materialNo, name: form.name, model: form.model, unitPrice: Number(form.unitPrice), unit: form.unit, categoryName: form.categoryName, categoryId: 0, stock: 0, enabled: form.enabled };
    if (editing) await updatePart(editing.id, payload); else await createPart(payload);
    setModalOpen(false); fetchData();
  };

  const handleToggle = async (id: number) => { await togglePartEnabled(id); fetchData(); };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10"><Package className="h-5 w-5 text-[var(--accent)]" /></div>
        <div><h1 className="text-lg font-semibold">配件管理</h1><p className="text-xs text-[var(--muted)]">维护配件主数据（物料字典）</p></div>
      </div>

      <div className="flex items-center gap-3">
        <SearchField value={keyword} onChange={setKeyword} className="w-64" />
        <Select value={categoryFilter} onChange={(v) => { setCategoryFilter(String(v || '')); setPage(1); }} className="w-32">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover><ListBox>
            <ListBox.Item key="" id="" textValue="全部分类">全部分类<ListBox.ItemIndicator /></ListBox.Item>
            {categories.map(c => <ListBox.Item key={c} id={c} textValue={c}>{c}<ListBox.ItemIndicator /></ListBox.Item>)}
          </ListBox></Select.Popover>
        </Select>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onPress={openCreate}><Plus className="size-4" />新增配件</Button>
      </div>

      <Card>
        <Card.Content className="p-0">
          {loading ? <LoadingView skeleton skeletonRows={8} /> : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="配件列表">
                  <Table.Header>
                    <Table.Column isRowHeader>物料号</Table.Column>
                    <Table.Column isRowHeader>名称</Table.Column>
                    <Table.Column isRowHeader>型号</Table.Column>
                    <Table.Column isRowHeader>单价</Table.Column>
                    <Table.Column isRowHeader>单位</Table.Column>
                    <Table.Column isRowHeader>分类</Table.Column>
                    <Table.Column isRowHeader>状态</Table.Column>
                    <Table.Column isRowHeader>{/* 操作 */}</Table.Column>
                  </Table.Header>
                  <Table.Body items={parts} renderEmptyState={() => <EmptyView icon={Package} title="暂无配件数据" />}>
                    {(part: any) => (
                      <Table.Row key={part.id}>
                        <Table.Cell className="font-medium">{part.materialNo}</Table.Cell>
                        <Table.Cell>{part.name}</Table.Cell>
                        <Table.Cell>{part.model}</Table.Cell>
                        <Table.Cell>¥{part.unitPrice?.toLocaleString?.() || part.unitPrice}</Table.Cell>
                        <Table.Cell>{part.unit}</Table.Cell>
                        <Table.Cell>{part.categoryName}</Table.Cell>
                        <Table.Cell><Chip color={part.enabled ? 'success' : 'default'} variant="primary" size="sm">{part.enabled ? '启用' : '禁用'}</Chip></Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onPress={() => openEdit(part)}><Edit2 className="size-3.5" /></Button>
                            <Button variant="ghost" size="sm" onPress={() => handleToggle(part.id)}><Power className="size-3.5" /></Button>
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

      {/* Create/Edit Modal */}
      <Modal>
        <Modal.Backdrop isOpen={modalOpen} onOpenChange={(open) => { if (!open) setModalOpen(false); }}>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Heading>{editing ? '编辑配件' : '新增配件'}</Modal.Heading></Modal.Header>
              <Modal.Body>
                <div className="grid grid-cols-2 gap-3">
                  <TextField value={form.materialNo} onChange={(v) => setForm({ ...form, materialNo: v })}><Label>物料号 *</Label><Input placeholder="请输入物料号" /></TextField>
                  <TextField value={form.name} onChange={(v) => setForm({ ...form, name: v })}><Label>名称 *</Label><Input placeholder="请输入名称" /></TextField>
                  <TextField value={form.model} onChange={(v) => setForm({ ...form, model: v })}><Label>型号 *</Label><Input placeholder="请输入型号" /></TextField>
                  <TextField value={form.unitPrice} onChange={(v) => setForm({ ...form, unitPrice: v })}><Label>单价 *</Label><Input placeholder="0" type="number" /></TextField>
                  <TextField value={form.unit} onChange={(v) => setForm({ ...form, unit: v })}><Label>单位</Label><Input placeholder="个/根/套/件..." /></TextField>
                  <Select value={form.categoryName} onChange={(v) => setForm({ ...form, categoryName: String(v || '') })}>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover><ListBox>{categories.map(c => <ListBox.Item key={c} id={c} textValue={c}>{c}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
                  </Select>
                  <div className="col-span-2"><Checkbox isSelected={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })}>启用</Checkbox></div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button variant="primary" size="sm" onPress={handleSave}>保存</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>


    </div>
  );
}

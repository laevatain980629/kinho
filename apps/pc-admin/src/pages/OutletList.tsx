import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Chip, Button, SearchField, Modal, TextField, Label, Input } from '@heroui/react';
import { Building2, Plus, Edit2, Trash2, Power } from 'lucide-react';
import { LoadingView, EmptyView } from '@kinho/shared-components';
import type { Outlet } from '@kinho/shared-types';
import { OUTLET_STATUS_LABELS } from '@kinho/shared-types';
import { getOutlets, createOutlet, updateOutlet, deleteOutlet, toggleOutletStatus } from '@/services/outlet';

export default function OutletList() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);
  const [form, setForm] = useState({ name: '', manager: '', phone: '', address: '' });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    getOutlets({ keyword, page, pageSize: 20 })
      .then((res) => { setOutlets(res.list); setTotal(res.total); })
      .catch(() => { setOutlets([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [keyword, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm({ name: '', manager: '', phone: '', address: '' }); setModalOpen(true); };
  const openEdit = (o: Outlet) => { setEditing(o); setForm({ name: o.name, manager: o.manager || '', phone: o.phone, address: o.address || '' }); setModalOpen(true); };
  const handleSave = async () => {
    if (!form.name || !form.manager || !form.phone) return;
    if (editing) await updateOutlet(editing.id, form);
    else await createOutlet({ ...form, status: 'ACTIVE' });
    setModalOpen(false); fetchData();
  };
  const handleDelete = async (id: number) => { setDeleteId(null); await deleteOutlet(id); fetchData(); };
  const handleToggleStatus = async (id: number) => { await toggleOutletStatus(id); fetchData(); };
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
          <Building2 className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">网点管理</h1>
          <p className="text-xs text-[var(--muted)]">管理服务网点信息和状态</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SearchField value={keyword} onChange={setKeyword} className="w-64" />
        <div className="flex-1" />
        <Button variant="primary" size="sm" onPress={openCreate}><Plus className="size-4" />新增网点</Button>
      </div>

      <Card>
        <Card.Content className="p-0">
          {loading ? <LoadingView skeleton skeletonRows={8} /> : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="网点列表">
                  <Table.Header>
                    <Table.Column isRowHeader>网点名称</Table.Column>
                    <Table.Column isRowHeader>负责人</Table.Column>
                    <Table.Column isRowHeader>联系电话</Table.Column>
                    <Table.Column isRowHeader>地址</Table.Column>
                    <Table.Column isRowHeader>状态</Table.Column>
                    <Table.Column isRowHeader>{/* 操作 */}</Table.Column>
                  </Table.Header>
                  <Table.Body items={outlets} renderEmptyState={() => <EmptyView icon={Building2} title="暂无网点数据" />}>
                    {(outlet) => (
                      <Table.Row key={outlet.id}>
                        <Table.Cell className="font-medium">{outlet.name}</Table.Cell>
                        <Table.Cell>{outlet.manager || '—'}</Table.Cell>
                        <Table.Cell>{outlet.phone}</Table.Cell>
                        <Table.Cell className="text-[var(--muted)]">{outlet.address || '—'}</Table.Cell>
                        <Table.Cell><Chip color={outlet.status === 'ACTIVE' ? 'success' : 'danger'} variant="primary" size="sm">{OUTLET_STATUS_LABELS[outlet.status]}</Chip></Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onPress={() => openEdit(outlet)}><Edit2 className="size-3.5" />编辑</Button>
                            <Button variant="ghost" size="sm" onPress={() => handleToggleStatus(outlet.id)}><Power className="size-3.5" />{outlet.status === 'ACTIVE' ? '禁用' : '启用'}</Button>
                            <Button variant="ghost" size="sm" onPress={() => setDeleteId(outlet.id)}><Trash2 className="size-3.5" />删除</Button>
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
        <Modal.Backdrop isOpen={modalOpen} onOpenChange={(open) => { if (!open) setModalOpen(false); }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Heading>{editing ? '编辑网点' : '新增网点'}</Modal.Heading></Modal.Header>
              <Modal.Body>
                <div className="space-y-3">
                  <TextField value={form.name} onChange={(v) => setForm({ ...form, name: v })}>
                    <Label>网点名称 *</Label><Input placeholder="请输入网点名称" />
                  </TextField>
                  <TextField value={form.manager} onChange={(v) => setForm({ ...form, manager: v })}>
                    <Label>负责人 *</Label><Input placeholder="请输入负责人" />
                  </TextField>
                  <TextField value={form.phone} onChange={(v) => setForm({ ...form, phone: v })}>
                    <Label>联系电话 *</Label><Input placeholder="请输入联系电话" type="tel" />
                  </TextField>
                  <TextField value={form.address} onChange={(v) => setForm({ ...form, address: v })}>
                    <Label>地址</Label><Input placeholder="请输入地址" />
                  </TextField>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button variant="primary" size="sm" isDisabled={!form.name || !form.manager || !form.phone} onPress={handleSave}>保存</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal>
        <Modal.Backdrop isOpen={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Icon><Trash2 className="size-5 text-[var(--danger)]" /></Modal.Icon><Modal.Heading>确认删除</Modal.Heading></Modal.Header>
              <Modal.Body><p className="text-sm text-[var(--muted)]">删除后不可恢复，确定要删除该网点吗？</p></Modal.Body>
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

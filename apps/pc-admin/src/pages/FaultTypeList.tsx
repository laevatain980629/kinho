import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Chip, Button, Modal, TextField, Label, Input, Checkbox } from '@heroui/react';
import { AlertTriangle, Plus, Edit2, Trash2, Power, Inbox } from 'lucide-react';
import type { FaultType } from '@kinho/shared-types';
import { getFaultTypes, createFaultType, updateFaultType, deleteFaultType, toggleFaultTypeEnabled } from '@/services/fault-type';

export default function FaultTypeList() {
  const [faultTypes, setFaultTypes] = useState<FaultType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FaultType | null>(null);
  const [form, setForm] = useState({ name: '', sortOrder: '1', enabled: true });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(() => {
    getFaultTypes()
      .then((res) => setFaultTypes(res.list))
      .catch(() => setFaultTypes([]));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', sortOrder: String(faultTypes.length + 1), enabled: true });
    setModalOpen(true);
  };

  const openEdit = (ft: FaultType) => {
    setEditing(ft);
    setForm({ name: ft.name, sortOrder: String(ft.sortOrder), enabled: ft.enabled });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sortOrder) return;
    const payload = { name: form.name, sortOrder: Number(form.sortOrder), enabled: form.enabled };
    if (editing) {
      await updateFaultType(editing.id, payload);
    } else {
      await createFaultType(payload);
    }
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await deleteFaultType(id);
    setDeleteId(null);
    fetchData();
  };

  const handleToggle = async (id: number) => {
    await toggleFaultTypeEnabled(id);
    fetchData();
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--warning)]/10">
            <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">故障分类</h1>
            <p className="text-xs text-[var(--muted)]">管理维修故障类型分类</p>
          </div>
        </div>
        <Button variant="primary" onPress={openCreate}>
          <Plus className="h-4 w-4" />
          新增分类
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Card.Content className="p-0">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="故障分类列表">
                <Table.Header>
                  <Table.Column isRowHeader>排序号</Table.Column>
                  <Table.Column isRowHeader>分类名称</Table.Column>
                  <Table.Column isRowHeader>状态</Table.Column>
                  <Table.Column isRowHeader>操作</Table.Column>
                </Table.Header>
                <Table.Body
                  items={faultTypes}
                  renderEmptyState={() => (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
                      <Inbox className="mb-2 h-10 w-10 opacity-40" />
                      <p className="text-sm">暂无故障分类数据</p>
                    </div>
                  )}
                >
                  {(ft) => (
                    <Table.Row key={ft.id}>
                      <Table.Cell>{ft.sortOrder}</Table.Cell>
                      <Table.Cell className="font-medium">{ft.name}</Table.Cell>
                      <Table.Cell>
                        <Chip color={ft.enabled ? 'success' : 'default'} size="sm">
                          {ft.enabled ? '启用' : '禁用'}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onPress={() => openEdit(ft)}>
                            <Edit2 className="h-3.5 w-3.5" />
                            编辑
                          </Button>
                          <Button variant="ghost" size="sm" onPress={() => handleToggle(ft.id)}>
                            <Power className="h-3.5 w-3.5" />
                            {ft.enabled ? '禁用' : '启用'}
                          </Button>
                          <Button variant="ghost" size="sm" onPress={() => setDeleteId(ft.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card.Content>
      </Card>

      {/* Create/Edit Modal */}
      <Modal>
        <Modal.Backdrop isOpen={modalOpen} onOpenChange={(open) => { if (!open) setModalOpen(false); }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Heading>{editing ? '编辑分类' : '新增分类'}</Modal.Heading></Modal.Header>
              <Modal.Body>
                <div className="space-y-3">
                  <TextField value={form.name} onChange={(v) => setForm({ ...form, name: v })}>
                    <Label>分类名称 *</Label>
                    <Input placeholder="请输入分类名称" />
                  </TextField>
                  <TextField value={form.sortOrder} onChange={(v) => setForm({ ...form, sortOrder: v })}>
                    <Label>排序号 *</Label>
                    <Input placeholder="1" type="number" />
                  </TextField>
                  <Checkbox isSelected={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })}>启用</Checkbox>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button variant="primary" size="sm" isDisabled={!form.name || !form.sortOrder} onPress={handleSave}>保存</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal>
        <Modal.Backdrop isOpen={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon><Trash2 className="size-5 text-[var(--danger)]" /></Modal.Icon>
                <Modal.Heading>确认删除</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-[var(--muted)]">删除后不可恢复，确定要删除该分类吗？</p>
              </Modal.Body>
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

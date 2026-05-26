import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Chip, Button, Select, ListBox, Modal, TextField, Label, Input } from '@heroui/react';
import { UserCog, Plus, Edit, ToggleLeft, Trash2 } from 'lucide-react';
import { toast } from '@kinho/shared-components';
import { LoadingView, EmptyView } from '@kinho/shared-components';
import type { User, Outlet } from '@kinho/shared-types';
import { ROLE_LABELS, USER_STATUS_LABELS } from '@kinho/shared-types';
import { getUsers, createUser, updateUser, toggleUserStatus } from '@/services/user';
import { getAllOutlets } from '@/services/outlet';

const needsOutlet = (role: string) => ['outlet_manager', 'engineer', 'warehouse'].includes(role);

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([k, v]) => ({ key: k, label: v }));
const STATUS_OPTIONS = Object.entries(USER_STATUS_LABELS).map(([k, v]) => ({ key: k, label: v }));

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [form, setForm] = useState({ username: '', name: '', phone: '', role: 'engineer' as User['role'], outletId: undefined as number | undefined, status: 'ACTIVE' as User['status'], password: '' });

  const fetchData = useCallback(() => {
    setLoading(true);
    getUsers({ keyword, role: roleFilter || undefined, status: statusFilter || undefined, page, pageSize: 20 })
      .then((res) => { setUsers(res.list); setTotal(res.total); })
      .catch(() => { setUsers([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [keyword, roleFilter, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { getAllOutlets().then(setOutlets).catch(() => setOutlets([])); }, []);

  const openCreate = () => { setEditing(null); setForm({ username: '', name: '', phone: '', role: 'engineer', outletId: undefined, status: 'ACTIVE', password: '' }); setModalOpen(true); };

  const openEdit = (u: User) => { setEditing(u); setForm({ username: u.username, name: u.name, phone: u.phone, role: u.role, outletId: u.outletId, status: u.status, password: '' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.username || !form.name || !form.phone) return;
    if (!editing && !form.password) return;
    try {
      if (editing) {
        await updateUser(editing.id, { name: form.name, phone: form.phone, role: form.role, outletId: needsOutlet(form.role) ? form.outletId : undefined, status: form.status, ...(form.password ? { password: form.password } : {}) } as any);
        toast.success('用户已更新');
      } else {
        await createUser({ username: form.username, name: form.name, phone: form.phone, role: form.role, outletId: needsOutlet(form.role) ? form.outletId : undefined, status: form.status, password: form.password } as any);
        toast.success('用户已创建');
      }
      setModalOpen(false); fetchData();
    } catch { toast.danger('保存失败'); }
  };

  const handleToggleStatus = async (id: number) => {
    await toggleUserStatus(id); fetchData();
  };

  const handleDelete = async (id: number) => {
    setDeleteId(null);
    await updateUser(id, { status: 'DISABLED' } as any);
    toast.success('用户已禁用');
    fetchData();
  };

  const outletOptions = outlets.map((o) => ({ key: String(o.id), label: o.name }));
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-xl p-2.5 bg-[var(--accent)]/10">
          <UserCog className="size-6 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">管理系统用户，分配角色权限</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <TextField value={keyword} onChange={setKeyword} className="w-56">
          <Label className="sr-only">搜索</Label>
          <Input placeholder="搜索用户名、姓名..." />
        </TextField>
        <Select value={roleFilter} onChange={(v) => setRoleFilter(String(v || ''))} className="w-32">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="" id="" textValue="全部角色">全部角色<ListBox.ItemIndicator /></ListBox.Item>
              {ROLE_OPTIONS.map((o) => (
                <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select value={statusFilter} onChange={(v) => setStatusFilter(String(v || ''))} className="w-32">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="" id="" textValue="全部状态">全部状态<ListBox.ItemIndicator /></ListBox.Item>
              {STATUS_OPTIONS.map((o) => (
                <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onPress={openCreate}><Plus className="size-4" />新增用户</Button>
      </div>

      <Card>
        <Card.Content className="p-0">
          {loading ? <LoadingView skeleton skeletonRows={8} /> : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="用户列表">
                  <Table.Header>
                    <Table.Column isRowHeader>用户名</Table.Column>
                    <Table.Column isRowHeader>姓名</Table.Column>
                    <Table.Column isRowHeader>手机号</Table.Column>
                    <Table.Column isRowHeader>角色</Table.Column>
                    <Table.Column isRowHeader>网点</Table.Column>
                    <Table.Column isRowHeader>状态</Table.Column>
                    <Table.Column isRowHeader>{/* 操作 */}</Table.Column>
                  </Table.Header>
                  <Table.Body items={users} renderEmptyState={() => <EmptyView title="暂无用户" />}>
                    {(user) => (
                      <Table.Row key={user.id}>
                        <Table.Cell className="font-medium">{user.username}</Table.Cell>
                        <Table.Cell>{user.name}</Table.Cell>
                        <Table.Cell>{user.phone}</Table.Cell>
                        <Table.Cell><Chip color="accent" variant="primary" size="sm">{ROLE_LABELS[user.role]}</Chip></Table.Cell>
                        <Table.Cell className="text-[var(--muted)]">{user.outletName || '—'}</Table.Cell>
                        <Table.Cell><Chip color={user.status === 'ACTIVE' ? 'success' : 'danger'} variant="primary" size="sm">{USER_STATUS_LABELS[user.status]}</Chip></Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onPress={() => openEdit(user)}><Edit className="size-4" />编辑</Button>
                            <Button variant="ghost" size="sm" onPress={() => handleToggleStatus(user.id)}><ToggleLeft className="size-4" />{user.status === 'ACTIVE' ? '禁用' : '启用'}</Button>
                            <Button variant="ghost" size="sm" onPress={() => setDeleteId(user.id)}><Trash2 className="size-4 text-[var(--danger)]" />删除</Button>
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

      {/* Create/Edit Modal — HeroUI */}
      <Modal>
        <Modal.Backdrop isOpen={modalOpen} onOpenChange={(open) => { if (!open) setModalOpen(false); }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{editing ? '编辑用户' : '新增用户'}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="space-y-3">
                  <TextField value={form.username} onChange={(v) => setForm({ ...form, username: v })} isDisabled={!!editing}>
                    <Label>用户名 *</Label>
                    <Input placeholder="请输入用户名" />
                  </TextField>
                  <TextField value={form.name} onChange={(v) => setForm({ ...form, name: v })}>
                    <Label>姓名 *</Label>
                    <Input placeholder="请输入姓名" />
                  </TextField>
                  <TextField value={form.phone} onChange={(v) => setForm({ ...form, phone: v })}>
                    <Label>手机号 *</Label>
                    <Input placeholder="请输入手机号" type="tel" />
                  </TextField>
                  <TextField value={form.password} onChange={(v) => setForm({ ...form, password: v })}>
                    <Label>{editing ? '新密码' : '初始密码'} {editing ? '' : '*'}</Label>
                    <Input placeholder={editing ? '不填则不修改密码' : '请输入初始密码'} type="password" />
                  </TextField>
                  <Select value={form.role} onChange={(v) => { const rv = String(v || '') as User['role']; setForm({ ...form, role: rv, outletId: needsOutlet(rv) ? form.outletId : undefined }); }}>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {ROLE_OPTIONS.map((o) => (
                          <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  {needsOutlet(form.role) && (
                    <Select value={(form.outletId != null) ? String(form.outletId) : undefined} onChange={(v) => setForm({ ...form, outletId: v ? Number(v) : undefined })}>
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="_none" id="" textValue="请选择网点">请选择网点<ListBox.ItemIndicator /></ListBox.Item>
                          {outletOptions.map((o) => (
                            <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                  <Select value={form.status} onChange={(v) => setForm({ ...form, status: String(v || '') as User['status'] })}>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {STATUS_OPTIONS.map((o) => (
                          <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button variant="primary" size="sm" isDisabled={!form.username || !form.name || !form.phone} onPress={handleSave}>保存</Button>
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
                <p className="text-sm text-[var(--muted)]">该用户将被禁用且无法登录，确定吗？</p>
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

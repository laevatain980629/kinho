import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Chip } from '@heroui/react';
import { Key, Check, X, Shield } from 'lucide-react';
import type { Role } from '@kinho/shared-types';
import { ROLE_LABELS } from '@kinho/shared-types';
import { LoadingView, ErrorView } from '@kinho/shared-components';
import { getRolePermissions, type PermissionDetail, type RolePermissionMatrixItem } from '@/services/auth';

const MODULE_LABELS: Record<string, string> = {
  menu: '菜单可见性',
  work_order: '工单管理',
  quote: '报价管理',
  procurement: '采购管理',
  warehouse: '仓库/库存',
  parts: '领料/退库',
  asset: '资产管理',
  customer: '客户管理',
  machine: '机台管理',
  outlet: '网点管理',
  fault_type: '故障分类',
  report: '报表中心',
  follow_up: '回访管理',
  system: '系统管理',
  data: '数据范围',
  warehouse_scope: '仓库范围',
  notification: '通知',
};

function roleLabel(roleKey: string, fallback: string) {
  return ROLE_LABELS[roleKey as Role] || fallback || roleKey;
}

function moduleFromPermission(permission: PermissionDetail) {
  return permission.module || permission.key.split(':')[0];
}

export default function RolePermission() {
  const [roles, setRoles] = useState<RolePermissionMatrixItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionDetail[]>([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPermissions = () => {
    setLoading(true);
    setError('');
    getRolePermissions()
      .then((res) => {
        const roleList = res.roles || [];
        setRoles(roleList);
        setPermissions(res.permissions || []);
        setSelectedRoleKey((current) => current || roleList[0]?.key || '');
      })
      .catch((err) => {
        setError(err?.message || '加载角色权限失败');
        setRoles([]);
        setPermissions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const selectedRole = roles.find((role) => role.key === selectedRoleKey) || roles[0];
  const selectedPermissionSet = useMemo(
    () => new Set(selectedRole?.permissions || []),
    [selectedRole],
  );

  const groupedPermissions = useMemo(() => {
    const grouped = new Map<string, PermissionDetail[]>();
    permissions.forEach((permission) => {
      const moduleKey = moduleFromPermission(permission);
      if (!grouped.has(moduleKey)) grouped.set(moduleKey, []);
      grouped.get(moduleKey)?.push(permission);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
          <Key className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">角色权限</h1>
          <p className="text-xs text-[var(--muted)]">系统管理员可查看全部角色的真实权限矩阵</p>
        </div>
      </div>

      {loading ? (
        <Card><Card.Content className="p-5"><LoadingView skeleton skeletonRows={8} /></Card.Content></Card>
      ) : error ? (
        <Card><Card.Content className="p-5"><ErrorView error={error} onRetry={fetchPermissions} /></Card.Content></Card>
      ) : (
        <div className="grid grid-cols-[280px_1fr] gap-5">
          <Card>
            <Card.Header className="px-4 pt-4 pb-2">
              <Card.Title className="text-sm font-semibold">全部角色</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-2 px-3 pb-3">
              {roles.map((role) => {
                const active = role.key === selectedRole?.key;
                return (
                  <Button
                    key={role.key}
                    variant={active ? 'primary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start gap-2.5 text-sm font-medium"
                    onPress={() => setSelectedRoleKey(role.key)}
                  >
                    <Shield className="h-4 w-4" />
                    <span className="flex-1 text-left">{roleLabel(role.key, role.name)}</span>
                    <span className="text-xs opacity-70">{role.permissions.length}</span>
                  </Button>
                );
              })}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header className="flex-row items-center justify-between px-5 pt-5 pb-3">
              <div>
                <Card.Title className="text-sm font-semibold">
                  {selectedRole ? roleLabel(selectedRole.key, selectedRole.name) : '角色'} - 权限配置
                </Card.Title>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  共 {selectedRole?.permissions.length || 0} 项权限 / 系统权限点 {permissions.length} 项
                </p>
              </div>
              {selectedRole?.isLocked ? <Chip size="sm" variant="primary" color="accent">内置角色</Chip> : null}
            </Card.Header>
            <Card.Content className="p-0">
              <div className="max-h-[calc(100vh-220px)] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-secondary)]">
                      <th className="w-44 px-5 py-3 text-left font-semibold text-[var(--foreground)]">模块</th>
                      <th className="px-5 py-3 text-left font-semibold text-[var(--foreground)]">权限点</th>
                      <th className="w-24 px-4 py-3 text-center font-semibold text-[var(--foreground)]">类型</th>
                      <th className="w-24 px-4 py-3 text-center font-semibold text-[var(--foreground)]">是否拥有</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedPermissions.map(([moduleKey, modulePermissions]) => (
                      modulePermissions.map((permission, index) => {
                        const enabled = selectedPermissionSet.has(permission.key);
                        return (
                          <tr key={permission.key} className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface-secondary)]/50">
                            {index === 0 ? (
                              <td rowSpan={modulePermissions.length} className="px-5 py-3 align-top font-medium text-[var(--foreground)]">
                                {MODULE_LABELS[moduleKey] || moduleKey}
                              </td>
                            ) : null}
                            <td className="px-5 py-3">
                              <div className="font-medium text-[var(--foreground)]">{permission.name}</div>
                              <div className="mt-0.5 font-mono text-xs text-[var(--muted)]">{permission.key}</div>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-[var(--muted)]">{permission.type}</td>
                            <td className="px-4 py-3 text-center">
                              {enabled ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success)]/10">
                                  <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                                </span>
                              ) : (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
                                  <X className="h-3.5 w-3.5 text-[var(--muted)] opacity-40" />
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}
    </div>
  );
}

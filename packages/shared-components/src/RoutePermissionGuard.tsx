import React from 'react';
import { usePermissions } from './PermissionGate';

interface RoutePermissionGuardProps {
  permissions: string | string[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoutePermissionGuard({ permissions, mode = 'any', fallback, children }: RoutePermissionGuardProps) {
  const { has: _has, hasAny, hasAll, loading } = usePermissions();

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>;
  }

  const keys = Array.isArray(permissions) ? permissions : [permissions];
  const allowed = mode === 'all' ? hasAll(keys) : hasAny(keys);

  if (!allowed) {
    return fallback ? <>{fallback}</> : (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <h2>无权访问</h2>
        <p>您没有访问此页面的权限，请联系管理员。</p>
      </div>
    );
  }

  return <>{children}</>;
}

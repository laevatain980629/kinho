import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface PermissionContextValue {
  permissions: string[];
  role: string | null;
  loading: boolean;
  has: (key: string) => boolean;
  hasAny: (keys: string[]) => boolean;
  hasAll: (keys: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  role: null,
  loading: true,
  has: () => false,
  hasAny: () => false,
  hasAll: () => false,
});

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = () => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      setLoading(true);
      if (!token) {
        setPermissions([]);
        setRole(null);
        setLoading(false);
        return;
      }

      fetch('/api/auth/me/permissions', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          if (r.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.replace('/login');
            return null;
          }
          if (!r.ok) throw new Error(`Permission request failed: ${r.status}`);
          return r.json();
        })
        .then((data) => {
          if (!data) return;
          setPermissions(data.permissions || []);
          setRole(data.role || null);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    loadPermissions();
    window.addEventListener('kinho-auth-changed', loadPermissions);
    return () => window.removeEventListener('kinho-auth-changed', loadPermissions);
  }, []);

  const has = useCallback((key: string) => role === 'admin' || permissions.includes(key), [permissions, role]);
  const hasAny = useCallback((keys: string[]) => role === 'admin' || keys.some((k) => permissions.includes(k)), [permissions, role]);
  const hasAll = useCallback((keys: string[]) => role === 'admin' || keys.every((k) => permissions.includes(k)), [permissions, role]);

  return (
    <PermissionContext.Provider value={{ permissions, role, loading, has, hasAny, hasAll }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}

interface PermissionGateProps {
  permissions: string | string[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ permissions, mode = 'any', fallback = null, children }: PermissionGateProps) {
  const { has: _has, hasAny, hasAll, loading } = usePermissions();

  if (loading) return null;

  const keys = Array.isArray(permissions) ? permissions : [permissions];
  const allowed = mode === 'all' ? hasAll(keys) : hasAny(keys);

  return allowed ? <>{children}</> : <>{fallback}</>;
}

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permissions: string | string[];
  mode?: 'any' | 'all';
  children: React.ReactNode;
}

export function PermissionButton({ permissions, mode = 'any', children, ...props }: PermissionButtonProps) {
  const { has: _has, hasAny, hasAll, loading } = usePermissions();

  if (loading) return null;

  const keys = Array.isArray(permissions) ? permissions : [permissions];
  const allowed = mode === 'all' ? hasAll(keys) : hasAny(keys);

  if (!allowed) return null;

  return <button {...props}>{children}</button>;
}

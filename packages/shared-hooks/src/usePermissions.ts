import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/auth/me/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setPermissions(data.permissions || []);
        setRole(data.role || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const has = useCallback(
    (key: string) => role === 'admin' || permissions.includes(key),
    [permissions, role],
  );

  const hasAny = useCallback(
    (keys: string[]) => role === 'admin' || keys.some((k) => permissions.includes(k)),
    [permissions, role],
  );

  const hasAll = useCallback(
    (keys: string[]) => role === 'admin' || keys.every((k) => permissions.includes(k)),
    [permissions, role],
  );

  return { permissions, role, loading, has, hasAny, hasAll };
}

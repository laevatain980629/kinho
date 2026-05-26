export interface CurrentUser {
  id?: number;
  username?: string;
  name?: string;
  role?: string;
}

export function getCurrentUser(): CurrentUser | null {
  const raw = localStorage.getItem('user');
  if (raw) {
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }

  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub,
      username: payload.username,
      name: payload.name || payload.username,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function getCurrentUserName(): string | null {
  const user = getCurrentUser();
  return user?.name || user?.username || null;
}

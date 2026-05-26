import { apiGet, apiPost } from '../utils/api-client';

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: string;
  refType: string | null;
  refId: number | null;
  isRead: boolean;
  createdAt: string;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return apiGet('/notifications');
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return apiGet('/notifications/unread-count');
}

export async function markRead(id: number): Promise<void> {
  await apiPost(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await apiPost('/notifications/read-all');
}

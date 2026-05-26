import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTheme } from '@kinho/shared-components';
import { Button, SearchField, Badge, Popover, ListBox } from '@heroui/react';
import { Sun, Moon, Bell, Circle, LogOut, UserCog } from 'lucide-react';
import type { NotificationItem } from '@/services/notification';
import { getNotifications, getUnreadCount, markAllRead, markRead } from '@/services/notification';

function parseUserName(): string | null {
  try { return JSON.parse(localStorage.getItem('user') || '{}').name || null; }
  catch { return null; }
}

interface TopBarProps {
  title: string;
  breadcrumbs?: { label: string; path?: string }[];
}

export default function TopBar({ title, breadcrumbs = [] }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const refreshCount = useCallback(() => {
    getUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, 30000);
    return () => clearInterval(timer);
  }, [refreshCount]);

  const openNotifs = async () => {
    const list = await getNotifications();
    setNotifs(list);
    setPopoverOpen(true);
  };

  const handleMarkAll = async () => {
    await markAllRead();
    setUnreadCount(0);
    setNotifs(notifs.map(n => ({ ...n, isRead: true })));
  };

  const handleClickNotif = async (n: NotificationItem) => {
    if (!n.isRead) {
      await markRead(n.id);
      setUnreadCount(c => Math.max(0, c - 1));
    }
    setPopoverOpen(false);
    if (n.refType === 'work_order' && n.refId) {
      navigate(`/work-orders/${n.refId}`);
    }
  };

  const refMap: Record<string, string> = { work_order: '工单', escalation: '升级', parts_request: '配件申请' };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6">
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="text-[var(--muted)]">
            {i > 0 && <span className="mx-2 text-[var(--border)]">/</span>}
            {crumb.path ? (
              <Link to={crumb.path} className="transition-colors hover:text-[var(--foreground)]">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-[var(--foreground)]">{crumb.label}</span>
            )}
          </span>
        ))}
        {breadcrumbs.length === 0 && (
          <span className="font-medium text-[var(--foreground)]">{title}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <SearchField value={searchValue} onChange={setSearchValue} className="w-56" />

        {/* Notification Bell + Badge */}
        <Popover isOpen={popoverOpen} onOpenChange={setPopoverOpen}>
          <Button variant="ghost" size="sm" className="h-9 w-9 min-w-0 relative" aria-label="通知" onPress={openNotifs}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <Badge content={String(unreadCount)} color="danger" size="sm" className="absolute -top-0.5 -right-0.5" />
            )}
          </Button>
          <Popover.Content className="w-80 max-h-96 overflow-auto">
            <div className="flex items-center justify-between px-1 py-2 border-b border-[var(--border)] mb-1">
              <span className="text-sm font-semibold">通知</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-[var(--accent)]" onPress={handleMarkAll}>
                  全部已读
                </Button>
              )}
            </div>
            {notifs.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--muted)]">暂无通知</div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-[var(--surface-secondary)] ${!n.isRead ? 'bg-[var(--accent)]/5' : ''}`}
                  onClick={() => handleClickNotif(n)}
                >
                  {!n.isRead && <Circle size={8} className="mt-1.5 text-[var(--accent)] fill-[var(--accent)] flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--foreground)] truncate">{n.title}</div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">{n.body}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {n.refType && <span className="text-[10px] text-[var(--accent)]">{refMap[n.refType] || n.refType}</span>}
                      <span className="text-[10px] text-[var(--muted)]">{new Date(n.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </Popover.Content>
        </Popover>

        <Button variant="ghost" size="sm" className="h-9 w-9 min-w-0" onPress={toggleTheme} aria-label="切换主题">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </Button>

        <div className="mx-1 h-6 w-px bg-[var(--border)]" />

        <Popover isOpen={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <Button variant="ghost" size="sm" className="gap-2.5 px-2 h-9" aria-label="用户菜单">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-[var(--accent-foreground)]">
              {(parseUserName() || '未')[0]}
            </span>
            <span className="text-sm font-medium text-[var(--foreground)]">{parseUserName() || '未登录'}</span>
          </Button>
          <Popover.Content className="w-40">
            <ListBox>
              <ListBox.Item key="switch" id="switch" textValue="切换用户" onAction={() => { setUserMenuOpen(false); navigate('/login'); }}>
                <UserCog className="size-4" /> 切换用户
              </ListBox.Item>
              <ListBox.Item key="logout" id="logout" textValue="退出登录" onAction={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUserMenuOpen(false);
                navigate('/login');
              }}>
                <LogOut className="size-4" /> 退出登录
              </ListBox.Item>
            </ListBox>
          </Popover.Content>
        </Popover>
      </div>
    </header>
  );
}

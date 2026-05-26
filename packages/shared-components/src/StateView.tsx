import { Spinner, Skeleton, Button } from '@heroui/react';
import {
  RefreshCw,
  Inbox,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

// ─── LoadingView ─────────────────────────────────────────────

interface LoadingViewProps {
  /** 加载提示文字 */
  text?: string;
  /** 是否使用骨架屏 */
  skeleton?: boolean;
  /** 骨架屏行数 */
  skeletonRows?: number;
  className?: string;
}

export function LoadingView({
  text = '加载中...',
  skeleton = false,
  skeletonRows = 5,
  className = '',
}: LoadingViewProps) {
  if (skeleton) {
    return (
      <div className={`space-y-3 p-4 ${className}`}>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton
            key={i}
            className={`rounded-lg ${i === 0 ? 'h-8 w-1/3' : 'h-12 w-full'}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <Spinner size="lg" color="accent" />
      <p className="mt-4 text-sm text-[var(--muted)]">{text}</p>
    </div>
  );
}

// ─── EmptyView ───────────────────────────────────────────────

interface EmptyViewProps {
  /** 图标组件 (lucide-react) */
  icon?: LucideIcon;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 操作按钮文字 */
  actionLabel?: string;
  /** 操作按钮点击 */
  onAction?: () => void;
  className?: string;
}

export function EmptyView({
  icon: Icon = Inbox,
  title = '暂无数据',
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyViewProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 px-4 ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
        <Icon className="size-8 text-[var(--muted)]" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 text-sm font-medium text-[var(--foreground)]">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-[var(--muted)] text-center max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="sm"
          className="mt-5"
          onPress={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// ─── ErrorView ───────────────────────────────────────────────

interface ErrorViewProps {
  /** 错误信息 */
  error?: string;
  /** 重试回调 */
  onRetry?: () => void;
  /** 错误图标 */
  icon?: LucideIcon;
  className?: string;
}

export function ErrorView({
  error = '加载失败，请稍后重试',
  onRetry,
  icon: Icon = AlertTriangle,
  className = '',
}: ErrorViewProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 px-4 ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger)]/10">
        <Icon className="size-8 text-[var(--danger)]" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 text-sm font-medium text-[var(--foreground)]">出错了</h3>
      <p className="mt-1 text-xs text-[var(--muted)] text-center max-w-xs">{error}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onPress={onRetry}
        >
          <RefreshCw className="size-3.5 mr-1.5" />
          重试
        </Button>
      )}
    </div>
  );
}

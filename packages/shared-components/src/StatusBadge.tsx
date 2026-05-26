import { Chip } from '@heroui/react';
import type { ChipProps } from '@heroui/react';

type StatusVariant = 'accent' | 'warning' | 'success' | 'danger' | 'default';

interface StatusBadgeProps extends Omit<ChipProps, 'color' | 'variant' | 'children'> {
  label: string;
  color: StatusVariant;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 统一的状态徽章组件
 * 基于 HeroUI Chip，封装语义色预设
 *
 * 用法:
 *   <StatusBadge label="维修中" color="warning" />
 *   <StatusBadge label="已完成" color="success" size="sm" />
 */
export function StatusBadge({ label, color, size = 'sm', ...rest }: StatusBadgeProps) {
  return (
    <Chip color={color} variant="primary" size={size} {...rest}>
      {label}
    </Chip>
  );
}

/**
 * 快捷预设 - 工单状态色映射
 */
export const ORDER_STATE_COLORS: Record<string, StatusVariant> = {
  CREATED: 'accent',
  ACCEPTED: 'accent',
  OUTLET_ASSIGNED: 'accent',
  ENGINEER_ASSIGNED: 'accent',
  SIGNED_IN: 'default',
  FAULT_CONFIRMED: 'default',
  REPAIRING: 'warning',
  PENDING_SIGNATURE: 'default',
  REPAIR_COMPLETED: 'success',
  FOLLOW_UP_PENDING: 'default',
  CLOSED: 'default',
  CANCELLED: 'danger',
};

/**
 * 快捷预设 - 优先级色映射
 */
export const PRIORITY_COLORS: Record<string, StatusVariant> = {
  URGENT: 'danger',
  CRITICAL: 'danger',
  NORMAL: 'default',
};

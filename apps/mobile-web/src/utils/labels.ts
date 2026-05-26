import type { WorkOrderPriority, WorkOrderState } from '@kinho/shared-types';

export const stateLabels: Record<string, string> = {
  CREATED: '待受理',
  ACCEPTED: '待派网点',
  OUTLET_ASSIGNED: '待派工程师',
  ENGINEER_ASSIGNED: '待签到',
  SIGNED_IN: '待确认故障',
  FAULT_CONFIRMED: '待开始维修',
  REPAIRING: '维修中',
  PENDING_SIGNATURE: '待客户签字',
  REPAIR_COMPLETED: '维修完成',
  FOLLOW_UP_PENDING: '待回访',
  CLOSED: '已关闭',
  CANCELLED: '已取消',
};

export const priorityLabels: Record<string, string> = {
  NORMAL: '普通',
  URGENT: '紧急',
  CRITICAL: '严重',
};

export function stateLabel(state?: WorkOrderState | string | null) {
  return state ? stateLabels[state] || state : '-';
}

export function priorityLabel(priority?: WorkOrderPriority | string | null) {
  return priority ? priorityLabels[priority] || priority : '-';
}

// 工单主状态
export const WorkOrderState = {
  CREATED: 'CREATED',
  ACCEPTED: 'ACCEPTED',
  OUTLET_ASSIGNED: 'OUTLET_ASSIGNED',
  ENGINEER_ASSIGNED: 'ENGINEER_ASSIGNED',
  SIGNED_IN: 'SIGNED_IN',
  FAULT_CONFIRMED: 'FAULT_CONFIRMED',
  REPAIRING: 'REPAIRING',
  PENDING_SIGNATURE: 'PENDING_SIGNATURE',
  REPAIR_COMPLETED: 'REPAIR_COMPLETED',
  FOLLOW_UP_PENDING: 'FOLLOW_UP_PENDING',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type WorkOrderState = (typeof WorkOrderState)[keyof typeof WorkOrderState];

export const WORK_ORDER_STATE_LABELS: Record<WorkOrderState, string> = {
  CREATED: '已创建',
  ACCEPTED: '已受理',
  OUTLET_ASSIGNED: '已派网点',
  ENGINEER_ASSIGNED: '已派工程师',
  SIGNED_IN: '已签到',
  FAULT_CONFIRMED: '故障已确认',
  REPAIRING: '维修中',
  PENDING_SIGNATURE: '待签名',
  REPAIR_COMPLETED: '维修完成',
  FOLLOW_UP_PENDING: '待回访',
  CLOSED: '已关闭',
  CANCELLED: '已取消',
};

// 工单优先级
export const WorkOrderPriority = {
  NORMAL: 'NORMAL',
  URGENT: 'URGENT',
  CRITICAL: 'CRITICAL',
} as const;

export type WorkOrderPriority = (typeof WorkOrderPriority)[keyof typeof WorkOrderPriority];

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  NORMAL: '普通',
  URGENT: '紧急',
  CRITICAL: '严重',
};

// 工单来源
export const WorkOrderSource = {
  CUSTOMER_H5: 'CUSTOMER_H5',
  PHONE: 'PHONE',
  PC: 'PC',
  OTHER: 'OTHER',
} as const;

export type WorkOrderSource = (typeof WorkOrderSource)[keyof typeof WorkOrderSource];

// 工单列表项
export interface WorkOrderListItem {
  id: number;
  orderNo: string;
  title: string;
  officialTitle?: string | null;
  customerTitleSnapshot?: string | null;
  state: WorkOrderState;
  priority: WorkOrderPriority;
  outletName: string;
  outletId: number | null;
  engineerName: string | null;
  engineerId: number | null;
  customerNameSnapshot: string;
  machineSerialSnapshot: string | null;
  source: WorkOrderSource;
  createdAt: string;
  updatedAt: string;
}

// 工单详情
export interface WorkOrderDetail extends WorkOrderListItem {
  description: string;
  customerPhoneSnapshot: string;
  serviceAddressSnapshot: string;
  machineModelSnapshot: string | null;
  creatorName: string;
  acceptedAt: string | null;
  outletAssignedAt: string | null;
  engineerAssignedAt: string | null;
  signedInAt: string | null;
  faultConfirmedAt: string | null;
  repairStartedAt: string | null;
  receiptSubmittedAt: string | null;
  customerSignedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  stateEnteredAt: string;
  warrantyExpiry: string | null;
  isUnderWarranty: boolean | null;
  warrantyStatus?: 'IN_WARRANTY' | 'OUT_OF_WARRANTY' | 'UNKNOWN' | 'OVERRIDDEN' | null;
  warrantyPolicySnapshot?: string | null;
  warrantyStartSnapshot?: string | null;
  warrantyEndSnapshot?: string | null;
  warrantyJudgedAt?: string | null;
  warrantyOverrideReason?: string | null;
  estimatedCost: number;
  blockReason: string | null;
  holdStatus: string | null;
  holdReason: string | null;
  faultDesc: string | null;
  faultTypeIdsJson?: string | null;
  faultTypeNamesSnapshot?: string | null;
  faultCause?: string | null;
  faultPhotos?: string | null;
  suggestedRepairPlan?: string | null;
  needQuote?: boolean | null;
  needParts?: boolean | null;
  needProcurement?: boolean | null;
  customerTitleSnapshot?: string | null;
  acceptRemark?: string | null;
}

// 工单操作历史
export interface WorkOrderHistory {
  id: number;
  workOrderId: number;
  action: string;
  fromState: WorkOrderState | null;
  toState: WorkOrderState | null;
  operatorName: string;
  operatorRole: string;
  reason: string | null;
  payload?: string | null;
  createdAt: string;
}

// 报修申请
export const CustomerRequestState = {
  SUBMITTED: 'SUBMITTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  MERGED_DUPLICATE: 'MERGED_DUPLICATE',
} as const;

export type CustomerRequestState = (typeof CustomerRequestState)[keyof typeof CustomerRequestState];

// 挂起原因（自由文本，不限制枚举值）

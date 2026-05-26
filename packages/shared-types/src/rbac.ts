// 9 个内置角色
export const Roles = {
  ADMIN: 'admin',
  HQ_SERVICE: 'hq_service',
  OUTLET_MANAGER: 'outlet_manager',
  ENGINEER: 'engineer',
  SUPERVISOR: 'supervisor',
  CHIEF_ENGINEER: 'chief_engineer',
  WAREHOUSE: 'warehouse',
  PROCUREMENT: 'procurement',
  FOLLOW_UP_SPECIALIST: 'follow_up_specialist',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const ROLE_LABELS: Record<Role, string> = {
  admin: '系统管理员',
  hq_service: '总部客服',
  outlet_manager: '网点经理',
  engineer: '维修工程师',
  supervisor: '审批主管',
  chief_engineer: '总工程师',
  warehouse: '仓库管理员',
  procurement: '采购专员',
  follow_up_specialist: '回访专员',
};

// 权限类型
export const PermissionType = {
  FUNCTION: 'FUNCTION',
  PROCESS: 'PROCESS',
  DATA: 'DATA',
} as const;

export type PermissionType = (typeof PermissionType)[keyof typeof PermissionType];

// 数据权限
export const DataScope = {
  ALL: 'data:all',
  HQ_ALL: 'data:hq_all',
  OUTLET_SELF: 'data:outlet_self',
  WORK_ORDER_SELF: 'data:work_order_self',
} as const;

export type DataScope = (typeof DataScope)[keyof typeof DataScope];

// 用户
export interface User {
  id: number;
  username: string;
  name: string;
  phone: string;
  role: Role;
  outletId?: number;
  outletName?: string;
  status: 'ACTIVE' | 'DISABLED';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const USER_STATUS_LABELS: Record<User['status'], string> = {
  ACTIVE: '启用',
  DISABLED: '禁用',
};

// 权限 Key 常量
export const PermissionKeys = {
  MENU_DASHBOARD: 'menu:dashboard',
  MENU_WORK_ORDER: 'menu:work_order',
  MENU_ASSET: 'menu:asset',
  MENU_QUOTE: 'menu:quote',
  MENU_PROCUREMENT: 'menu:procurement',
  MENU_WAREHOUSE: 'menu:warehouse',
  MENU_INVENTORY: 'menu:inventory',
  MENU_PARTS_REQUEST: 'menu:parts_request',
  MENU_PARTS_RETURN: 'menu:parts_return',
  MENU_APPROVAL: 'menu:approval',
  MENU_REPORT: 'menu:report',
  MENU_SYSTEM: 'menu:system',
  MENU_AUDIT: 'menu:audit',
  // 工单
  WORK_ORDER_VIEW: 'work_order:view',
  WORK_ORDER_CREATE: 'work_order:create',
  WORK_ORDER_ACCEPT: 'work_order:accept',
  WORK_ORDER_ASSIGN_OUTLET: 'work_order:assign_outlet',
  WORK_ORDER_ASSIGN_ENGINEER: 'work_order:assign_engineer',
  WORK_ORDER_SIGN_IN: 'work_order:sign_in',
  WORK_ORDER_CONFIRM_FAULT: 'work_order:confirm_fault',
  WORK_ORDER_START_REPAIR: 'work_order:start_repair',
  WORK_ORDER_SUBMIT_RECEIPT: 'work_order:submit_receipt',
  WORK_ORDER_CUSTOMER_SIGN: 'work_order:customer_sign',
  WORK_ORDER_CLOSE: 'work_order:close',
  WORK_ORDER_CANCEL: 'work_order:cancel',
  WORK_ORDER_ESCALATE: 'work_order:escalate',
  WORK_ORDER_APPROVE_ESCALATE: 'work_order:approve_escalate',
  WORK_ORDER_RETURN_APPLY: 'work_order:return_apply',
  WORK_ORDER_APPROVE_RETURN: 'work_order:approve_return',
  WORK_ORDER_CHIEF_HANDLE: 'work_order:chief_handle',
  // 报价
  QUOTE_VIEW: 'quote:view',
  QUOTE_CREATE: 'quote:create',
  QUOTE_SUBMIT: 'quote:submit',
  QUOTE_APPROVE: 'quote:approve',
  QUOTE_REJECT: 'quote:reject',
  QUOTE_CONFIRM_CUSTOMER: 'quote:confirm_customer',
  QUOTE_CANCEL: 'quote:cancel',
  // 采购
  PROCUREMENT_VIEW: 'procurement:view',
  PROCUREMENT_CREATE: 'procurement:create',
  PROCUREMENT_QUOTE: 'procurement:quote',
  PROCUREMENT_APPROVE: 'procurement:approve',
  PROCUREMENT_ORDER: 'procurement:order',
  PROCUREMENT_RECEIVE: 'procurement:receive',
  PROCUREMENT_CANCEL: 'procurement:cancel',
  // 领料与仓库
  PARTS_VIEW: 'parts:view',
  PARTS_APPLY: 'parts:apply',
  PARTS_APPROVE: 'parts:approve',
  PARTS_SHIP: 'parts:ship',
  PARTS_RECEIVE: 'parts:receive',
  PARTS_RETURN_APPLY: 'parts:return_apply',
  PARTS_RETURN_CONFIRM: 'parts:return_confirm',
  WAREHOUSE_VIEW: 'warehouse:view',
  WAREHOUSE_STOCK_MANAGE: 'warehouse:stock_manage',
  WAREHOUSE_K3_SYNC: 'warehouse:k3_sync',
  WAREHOUSE_TRANSFER: 'warehouse:transfer',
  WAREHOUSE_ADJUST: 'warehouse:adjust',
  WAREHOUSE_INVENTORY_COUNT: 'warehouse:inventory_count',
  WAREHOUSE_RESERVATION_MANAGE: 'warehouse:reservation_manage',
  // 资产
  CUSTOMER_VIEW: 'customer:view',
  CUSTOMER_EDIT: 'customer:edit',
  CUSTOMER_TRANSFER: 'customer:transfer',
  MACHINE_VIEW: 'machine:view',
  MACHINE_EDIT: 'machine:edit',
  MACHINE_QRCODE: 'machine:qrcode',
  OUTLET_VIEW: 'outlet:view',
  OUTLET_EDIT: 'outlet:edit',
  OUTLET_BIND_USER: 'outlet:bind_user',
  // 系统
  FAULT_TYPE_VIEW: 'fault_type:view',
  FAULT_TYPE_EDIT: 'fault_type:edit',
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  FOLLOW_UP_VIEW: 'follow_up:view',
  FOLLOW_UP_HANDLE: 'follow_up:handle',
  SYSTEM_USER_MANAGE: 'system:user_manage',
  SYSTEM_ROLE_MANAGE: 'system:role_manage',
  SYSTEM_AUDIT_LOG: 'system:audit_log',
  // 数据权限
  DATA_ALL: 'data:all',
  DATA_HQ_ALL: 'data:hq_all',
  DATA_OUTLET_SELF: 'data:outlet_self',
  DATA_WORK_ORDER_SELF: 'data:work_order_self',
} as const;

export type PermissionKey = (typeof PermissionKeys)[keyof typeof PermissionKeys];

// 审计日志
export interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'APPROVE' | 'REJECT';
  module: string;
  targetId?: number;
  targetName?: string;
  detail?: string;
  ip?: string;
  occurredAt: string;
}

export const AUDIT_ACTION_LABELS: Record<AuditLog['action'], string> = {
  CREATE: '创建', UPDATE: '更新', DELETE: '删除', LOGIN: '登录',
  EXPORT: '导出', APPROVE: '审批通过', REJECT: '审批驳回',
};

export const AUDIT_ACTION_COLORS: Record<AuditLog['action'], 'default' | 'warning' | 'accent' | 'success' | 'danger'> = {
  CREATE: 'success', UPDATE: 'accent', DELETE: 'danger', LOGIN: 'default',
  EXPORT: 'default', APPROVE: 'success', REJECT: 'danger',
};

// 网点
export interface Outlet {
  id: number;
  name: string;
  manager: string | null;
  phone: string;
  address: string;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}

export const OUTLET_STATUS_LABELS: Record<Outlet['status'], string> = {
  ACTIVE: '启用',
  DISABLED: '禁用',
};

// 客户
export interface Customer {
  id: number;
  companyName: string;
  contactPerson: string;
  phone: string;
  address: string;
  outletId: number;
  outletName: string;
  createdAt: string;
  updatedAt: string;
}

// 机台
export interface Machine {
  id: number;
  serialNo: string;
  machineCode?: string | null;
  brand?: string | null;
  model: string;
  type?: string | null;
  customerId: number;
  customerName: string;
  outletId?: number | null;
  outletName?: string | null;
  currentHours?: number | null;
  purchaseDate: string | null;
  warrantyExpiry?: string | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  warrantyMonths?: number | null;
  warrantyPolicy?: string | null;
  warrantyRemark?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SCRAPPED';
  createdAt: string;
  updatedAt: string;
}

export const MACHINE_STATUS_LABELS: Record<Machine['status'], string> = {
  ACTIVE: '在用',
  INACTIVE: '停用',
  SCRAPPED: '报废',
};

// 故障分类
export interface FaultType {
  id: number;
  name: string;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 配件
export interface Part {
  id: number;
  materialNo: string;
  name: string;
  model: string;
  unitPrice: number | null;
  stock: number;
  unit: string;
  categoryId: number | null;
  categoryName: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 报价单 — status 对齐后端 QuoteStatus 枚举 (apps/api/src/common/enums/quote-states.ts)
export interface Quote {
  id: number;
  quoteNo: string;
  workOrderId: number;
  workOrderNo: string;
  status: 'DRAFT' | 'PENDING_SUPERVISOR' | 'APPROVED' | 'PENDING_CUSTOMER_CONFIRM' | 'CUSTOMER_CONFIRMED' | 'CUSTOMER_REJECTED' | 'PENDING_PROCUREMENT' | 'REJECTED' | 'SUPERSEDED' | 'CANCELLED';
  laborCost: number;
  totalAmount: number;
  remark: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const QUOTE_STATUS_LABELS: Record<Quote['status'], string> = {
  DRAFT: '草稿',
  PENDING_SUPERVISOR: '待主管审核',
  APPROVED: '已审批',
  PENDING_CUSTOMER_CONFIRM: '待客户确认',
  CUSTOMER_CONFIRMED: '客户已确认',
  CUSTOMER_REJECTED: '客户已驳回',
  PENDING_PROCUREMENT: '待采购确认',
  REJECTED: '已驳回',
  SUPERSEDED: '已替代',
  CANCELLED: '已作废',
};

export const QUOTE_STATUS_COLORS: Record<Quote['status'], 'default' | 'warning' | 'accent' | 'success' | 'danger'> = {
  DRAFT: 'default',
  PENDING_SUPERVISOR: 'warning',
  APPROVED: 'accent',
  PENDING_CUSTOMER_CONFIRM: 'accent',
  CUSTOMER_CONFIRMED: 'success',
  CUSTOMER_REJECTED: 'danger',
  PENDING_PROCUREMENT: 'accent',
  REJECTED: 'danger',
  SUPERSEDED: 'default',
  CANCELLED: 'default',
};

// 报价明细项
export interface QuoteItem {
  id: number;
  quoteId: number;
  partId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

// ========== 仓库与库存 ==========

export interface Warehouse {
  id: number;
  warehouseNo: string;
  name: string;
  type: 'HQ_WAREHOUSE' | 'OUTLET_WAREHOUSE' | 'ENGINEER_WAREHOUSE';
  outletId?: number;
  outletName?: string;
  ownerEngineerId?: number;
  ownerEngineerName?: string;
  ownerOutletIdSnapshot?: number;
  k3WarehouseCode?: string;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}

export const WAREHOUSE_TYPE_LABELS: Record<Warehouse['type'], string> = {
  HQ_WAREHOUSE: '总仓',
  OUTLET_WAREHOUSE: '网点仓',
  ENGINEER_WAREHOUSE: '个人仓',
};

export interface InventoryBalance {
  id: number;
  warehouseId: number;
  warehouseName: string;
  partId: number;
  partNo: string;
  partName: string;
  partModel: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityDamaged: number;
  version: number;
  updatedAt: string;
}

export type TransactionType =
  | 'K3_SYNC' | 'HQ_TO_OUTLET' | 'OUTLET_TO_ENGINEER'
  | 'ENGINEER_CONSUME' | 'ENGINEER_RETURN_TO_OUTLET'
  | 'OUTLET_RETURN_TO_HQ' | 'RESERVE' | 'RELEASE_RESERVE' | 'ADJUSTMENT';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  K3_SYNC: 'K3同步',
  HQ_TO_OUTLET: '总仓调拨',
  OUTLET_TO_ENGINEER: '预领出库',
  ENGINEER_CONSUME: '维修消耗',
  ENGINEER_RETURN_TO_OUTLET: '退库入库',
  OUTLET_RETURN_TO_HQ: '网点退回',
  RESERVE: '预占冻结',
  RELEASE_RESERVE: '解除预占',
  ADJUSTMENT: '盘点调整',
};

export const INVENTORY_DIRECTION_LABELS: Record<InventoryTransaction['direction'], string> = {
  IN: '入库',
  OUT: '出库',
  TRANSFER: '调拨',
  FREEZE: '冻结',
  UNFREEZE: '解冻',
  ADJUST: '盘点调整',
};

export interface InventoryTransaction {
  id: number;
  transactionNo: string;
  type: TransactionType;
  direction: 'IN' | 'OUT' | 'TRANSFER' | 'FREEZE' | 'UNFREEZE' | 'ADJUST';
  fromWarehouseId?: number;
  fromWarehouseName?: string;
  toWarehouseId?: number;
  toWarehouseName?: string;
  partId: number;
  partName: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  relatedOrderType?: string;
  relatedOrderId?: number;
  relatedWorkOrderId?: number;
  operatorId: number;
  operatorName: string;
  occurredAt: string;
  remark?: string;
}

// ========== 领料与退库 ==========

export type PartsRequestStatus =
  | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
  | 'SHIPPED' | 'RECEIVED' | 'CANCELLED';

export const PARTS_REQUEST_STATUS_LABELS: Record<PartsRequestStatus, string> = {
  DRAFT: '草稿', PENDING: '待审批', APPROVED: '已审批', REJECTED: '已驳回',
  SHIPPED: '已发货', RECEIVED: '已收货', CANCELLED: '已取消',
};

export const PARTS_REQUEST_STATUS_COLORS: Record<PartsRequestStatus, 'default' | 'warning' | 'accent' | 'success' | 'danger'> = {
  DRAFT: 'default', PENDING: 'warning', APPROVED: 'accent', REJECTED: 'danger',
  SHIPPED: 'accent', RECEIVED: 'success', CANCELLED: 'default',
};

export type PartsRequestType = 'PRE_PICK' | 'WORK_ORDER_PICK' | 'ADDITIONAL_PICK';

export const PARTS_REQUEST_TYPE_LABELS: Record<PartsRequestType, string> = {
  PRE_PICK: '预领料', WORK_ORDER_PICK: '工单领料', ADDITIONAL_PICK: '追加领料',
};

export interface PartsRequest {
  id: number;
  requestNo: string;
  type: PartsRequestType;
  workOrderId?: number;
  workOrderNo?: string;
  fromWarehouseId: number;
  fromWarehouseName: string;
  toWarehouseId: number;
  toWarehouseName: string;
  status: PartsRequestStatus;
  items: PartsRequestItem[];
  totalQuantity: number;
  remark?: string;
  createdById: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartsRequestItem {
  id: number;
  partId: number;
  partName: string;
  partModel: string;
  quantity: number;
  reservedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
}

export type PartsReturnStatus =
  | 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'RECEIVED'
  | 'REJECTED' | 'CANCELLED';

export const PARTS_RETURN_STATUS_LABELS: Record<PartsReturnStatus, string> = {
  DRAFT: '草稿', PENDING: '待确认', CONFIRMED: '已确认', RECEIVED: '已入账',
  REJECTED: '已驳回', CANCELLED: '已取消',
};

export const PARTS_RETURN_STATUS_COLORS: Record<PartsReturnStatus, 'default' | 'warning' | 'accent' | 'success' | 'danger'> = {
  DRAFT: 'default', PENDING: 'warning', CONFIRMED: 'accent', RECEIVED: 'success',
  REJECTED: 'danger', CANCELLED: 'default',
};

export type ReturnReason = 'NOT_USED' | 'WRONG_PART' | 'EXCESS' | 'DAMAGED_RETURN' | 'OLD_PART_RETURN' | 'OTHER';

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  NOT_USED: '未使用', WRONG_PART: '带错配件', EXCESS: '多领',
  DAMAGED_RETURN: '损坏件退回', OLD_PART_RETURN: '旧件回收', OTHER: '其他',
};

export type QualityResult = 'GOOD' | 'DAMAGED' | 'OLD_PART' | 'NEED_INSPECTION';

export const QUALITY_RESULT_LABELS: Record<QualityResult, string> = {
  GOOD: '好件', DAMAGED: '损坏', OLD_PART: '旧件', NEED_INSPECTION: '待检测',
};

export const QUALITY_RESULT_COLORS: Record<QualityResult, 'default' | 'warning' | 'accent' | 'success' | 'danger'> = {
  GOOD: 'success', DAMAGED: 'danger', OLD_PART: 'warning', NEED_INSPECTION: 'default',
};

export interface PartsReturn {
  id: number;
  returnNo: string;
  workOrderId?: number;
  workOrderNo?: string;
  fromWarehouseId: number;
  fromWarehouseName: string;
  toWarehouseId: number;
  toWarehouseName: string;
  reason: ReturnReason;
  status: PartsReturnStatus;
  items: PartsReturnItem[];
  remark?: string;
  createdById: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartsReturnItem {
  id: number;
  partId: number;
  partName: string;
  partModel: string;
  quantity: number;
  qualityResult?: QualityResult;
}

// ========== 采购 ==========

export type ProcurementStatus =
  | 'DRAFT' | 'PENDING_QUOTE' | 'QUOTED' | 'PENDING_APPROVAL'
  | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED'
  | 'REJECTED' | 'CANCELLED';

export const PROCUREMENT_STATUS_LABELS: Record<ProcurementStatus, string> = {
  DRAFT: '草稿', PENDING_QUOTE: '待询价', QUOTED: '已询价',
  PENDING_APPROVAL: '待审批', APPROVED: '已批准', ORDERED: '已下单',
  PARTIALLY_RECEIVED: '部分到货', RECEIVED: '已到货',
  REJECTED: '已驳回', CANCELLED: '已作废',
};

export const PROCUREMENT_STATUS_COLORS: Record<ProcurementStatus, 'default' | 'warning' | 'accent' | 'success' | 'danger'> = {
  DRAFT: 'default', PENDING_QUOTE: 'warning', QUOTED: 'accent',
  PENDING_APPROVAL: 'warning', APPROVED: 'accent', ORDERED: 'accent',
  PARTIALLY_RECEIVED: 'warning', RECEIVED: 'success',
  REJECTED: 'danger', CANCELLED: 'default',
};

export interface ProcurementItem {
  id: number;
  partId: number;
  partName: string;
  partModel: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface SupplierQuote {
  id: number;
  supplierId: number;
  supplierName: string;
  quotedAmount: number;
  leadTimeDays: number;
  remark?: string;
  quotedAt: string;
}

export interface ProcurementRequest {
  id: number;
  procurementNo: string;
  workOrderId?: number;
  workOrderNo?: string;
  quoteId?: number;
  quoteNo?: string;
  supplierId: number;
  supplierName: string;
  status: ProcurementStatus;
  items: ProcurementItem[];
  supplierQuotes: SupplierQuote[];
  estimatedCost: number;
  actualCost?: number;
  remark?: string;
  createdById: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

// ========== 审批 ==========

export type ApprovalType = 'PARTS_REQUEST' | 'PARTS_RETURN' | 'QUOTE' | 'WORK_ORDER_ESCALATION';

export interface ApprovalItem {
  id: number;
  type: ApprovalType;
  sourceId: number;
  sourceNo: string;
  summary: string;
  applicantId: number;
  applicantName: string;
  approverId?: number;
  approverName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason?: string;
  createdAt: string;
  resolvedAt?: string;
}

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  PARTS_REQUEST: '领料审批',
  PARTS_RETURN: '退库确认',
  QUOTE: '报价审批',
  WORK_ORDER_ESCALATION: '工单升级',
};

export const APPROVAL_TYPE_COLORS: Record<ApprovalType, 'default' | 'warning' | 'accent' | 'success' | 'danger'> = {
  PARTS_REQUEST: 'accent',
  PARTS_RETURN: 'warning',
  QUOTE: 'success',
  WORK_ORDER_ESCALATION: 'danger',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalItem['status'], string> = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已驳回',
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalItem['status'], 'default' | 'warning' | 'accent' | 'success' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

// ========== 升级 ==========

export interface EscalationRequest {
  id: number;
  workOrderId: number;
  workOrderNo: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  applicantId: number;
  applicantName: string;
  approverId?: number;
  approverName?: string;
  resolution?: string;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export const ESCALATION_STATUS_LABELS: Record<EscalationRequest['status'], string> = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  RESOLVED: '已解决',
};

export const ESCALATION_STATUS_COLORS: Record<EscalationRequest['status'], 'default' | 'warning' | 'accent' | 'success' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'accent',
  REJECTED: 'danger',
  RESOLVED: 'success',
};

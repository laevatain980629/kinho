// ========== 通用 ==========

/** 文件附件（图片/文件上传） */
export interface Attachment {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

// ========== 工单流程表单 ==========

/** 创建工单（客服/H5 报修） */
export interface CreateWorkOrderForm {
  title: string;
  description: string;
  customerId?: number;
  machineId?: number;
  customerName: string;
  customerPhone: string;
  serviceAddress: string;
  machineSerial?: string;
  machineModel?: string;
  priority?: 'NORMAL' | 'URGENT' | 'CRITICAL';
  source: 'CUSTOMER_H5' | 'PHONE' | 'PC' | 'OTHER';
  estimatedCost?: number;
  attachments?: Attachment[];
}

/** 受理工单 */
export interface AcceptWorkOrderForm {
  workOrderId: number;
  officialTitle?: string;
  priority?: 'NORMAL' | 'URGENT' | 'CRITICAL';
  remark?: string;
}

/** 派单（分配网点） */
export interface DispatchForm {
  workOrderId: number;
  outletId: number;
  outletName: string;
}

/** 指派工程师 */
export interface AssignEngineerForm {
  workOrderId: number;
  engineerId: number;
  engineerName: string;
}

/** 工程师签到 */
export interface SignInForm {
  workOrderId: number;
  location: string;
  remark?: string;
  photos?: Attachment[];
}

/** 故障确认 */
export interface FaultConfirmForm {
  workOrderId: number;
  faultTypeIds: number[];
  faultTypeNames?: string[];
  faultDesc: string;
  faultCause?: string;
  faultPhotos?: Attachment[];
  suggestedRepairPlan?: string;
  needQuote: boolean;
  needParts: boolean;
  needProcurement: boolean;
}

// ========== 维修回执 ==========

/** 维修回执 - 维修项目 */
export interface ReceiptItem {
  name: string;
  description?: string;
  laborHours?: number;
}

/** 维修回执 - 使用配件 */
export interface PartItem {
  partId: number;
  partName: string;
  partModel?: string;
  quantity: number;
}

/** 维修回执 - 费用项 */
export interface ChargeItem {
  chargeType?: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

/** 维修回执表单 */
export interface ReceiptForm {
  workOrderId: number;
  repairSummary: string;
  repairItems: ReceiptItem[];
  partsUsed: PartItem[];
  charges?: ChargeItem[];
  afterRepairPhotos?: Attachment[];
  warrantyNote?: string;
}

/** 客户签名 */
export interface SignatureForm {
  receiptId: number;
  customerName: string;
  customerPhone?: string;
  signatureUrl: string;
  signedOnDevice?: string;
}

// ========== 回访与关单 ==========

/** 回访表单 */
export interface FollowUpForm {
  workOrderId: number;
  result: 'SATISFIED' | 'UNSATISFIED' | 'NEED_REVISIT';
  satisfactionScore?: number;
  comment: string;
  contactMethod: 'PHONE' | 'ON_SITE' | 'WECHAT';
}

/** 关闭工单 */
export interface CloseOrderForm {
  workOrderId: number;
  remark?: string;
}

/** 取消工单 */
export interface CancelOrderForm {
  workOrderId: number;
  reason: string;
}

// ========== 报价相关 ==========

/** 报价审批 */
export interface QuoteApprovalForm {
  approvalResult: 'APPROVE' | 'REJECT';
  approvalOpinion: string;
}

/** 客户确认报价 */
export interface CustomerConfirmForm {
  confirmResult: 'CUSTOMER_CONFIRMED' | 'CUSTOMER_REJECTED';
  confirmMethod: 'PHONE' | 'WECHAT' | 'ONSITE' | 'PAPER' | 'OTHER';
  confirmedByName: string;
  confirmedAt: string;
  customerOpinion: string;
  attachments: Attachment[];
}

// ========== 采购相关 ==========

/** 采购到货确认 */
export interface ProcurementReceiveForm {
  procurementId: number;
  items: {
    partId: number;
    partName: string;
    receivedQuantity: number;
  }[];
  remark?: string;
}

// ========== 领料与退库 ==========

/** 领料审批 */
export interface PartsApprovalForm {
  approvalResult: 'APPROVE' | 'REJECT';
  approvalOpinion: string;
}

/** 领料发货 - 发运配件项 */
export interface ShipPartItem {
  partName: string;
  quantity: number;
}

/** 领料发货 */
export interface PartsShipForm {
  shipParts: ShipPartItem[];
  shipMethod: 'SELF_PICKUP' | 'DELIVERY' | 'EXPRESS';
  trackingNo: string;
  shippedAt: string;
}

/** 退库确认 */
export interface ReturnConfirmForm {
  partsReturnId: number;
  action: 'CONFIRM' | 'REJECT';
  items?: {
    partId: number;
    qualityResult: 'GOOD' | 'DAMAGED' | 'OLD_PART' | 'NEED_INSPECTION';
  }[];
  rejectReason?: string;
}

// ========== 升级相关 ==========

/** 升级审批 */
export interface EscalationApprovalForm {
  escalationId: number;
  action: 'APPROVE' | 'REJECT';
  rejectReason?: string;
}

/** 总工处理 */
export interface ChiefHandleForm {
  escalationId: number;
  resolution: string;
}

/** 退回工单 */
export interface ReturnToForm {
  workOrderId: number;
  targetState: string;
  reason: string;
}

/** 退回审批 */
export interface ReturnApprovalForm {
  workOrderId: number;
  action: 'APPROVE' | 'REJECT';
  rejectReason?: string;
}

// ========== 回访完成/异常 ==========

/** 回访完成 */
export interface FollowUpCompleteForm {
  workOrderId: number;
  result: 'SATISFIED' | 'UNSATISFIED';
  satisfactionScore: number;
  comment: string;
  attachments?: Attachment[];
}

/** 回访异常 */
export interface FollowUpExceptionForm {
  workOrderId: number;
  reason: string;
  action: 'REOPEN' | 'ESCALATE';
  remark?: string;
}

// ========== 共享选项常量 ==========

export const CHARGE_TYPE_OPTIONS = [
  { value: 'LABOR', label: '人工费' },
  { value: 'MATERIAL', label: '材料费' },
  { value: 'TRAVEL', label: '差旅费' },
  { value: 'OTHER', label: '其他' },
] as const;

export type ChargeType = (typeof CHARGE_TYPE_OPTIONS)[number]['value'];

export const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: '普通' },
  { value: 'URGENT', label: '紧急' },
  { value: 'CRITICAL', label: '非常紧急' },
] as const;

export const SOURCE_OPTIONS = [
  { value: 'PHONE', label: '电话' },
  { value: 'PC', label: 'PC端' },
  { value: 'OTHER', label: '其他' },
] as const;

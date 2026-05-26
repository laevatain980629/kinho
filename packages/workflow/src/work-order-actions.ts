import type { WorkOrderActionKey, WorkOrderActionSchema, WorkflowFieldSchema } from './types';
import {
  buildAcceptPayload,
  buildDispatchOutletPayload,
  buildAssignEngineerPayload,
  buildConfirmFaultPayload,
  buildSubmitReceiptPayload,
} from './payload-builders';

// ── Shared field definitions ──

const priorityField: WorkflowFieldSchema = {
  name: 'priority', label: '优先级', type: 'select',
  options: [
    { value: 'NORMAL', label: '普通' },
    { value: 'URGENT', label: '紧急' },
    { value: 'CRITICAL', label: '非常紧急' },
  ],
};

const remarkField: WorkflowFieldSchema = {
  name: 'remark', label: '受理备注', type: 'textarea', placeholder: '选填',
};

const outletIdField: WorkflowFieldSchema = {
  name: 'outletId', label: '网点', type: 'outlet-select', required: true, optionsSource: 'outlets',
};

const dispatchReasonField: WorkflowFieldSchema = {
  name: 'dispatchReason', label: '派单原因', type: 'textarea', placeholder: '选填',
};

const expectedArriveField: WorkflowFieldSchema = {
  name: 'expectedArriveAt', label: '预计到达时间', type: 'datetime', placeholder: '如：2026-05-10 14:00',
};

const engineerIdField: WorkflowFieldSchema = {
  name: 'engineerId', label: '工程师', type: 'engineer-select', required: true, optionsSource: 'engineers',
};

const faultTypeIdsField: WorkflowFieldSchema = {
  name: 'faultTypeIds', label: '故障类型', type: 'multi-select', required: true, optionsSource: 'faultTypes',
};

const faultDescField: WorkflowFieldSchema = {
  name: 'faultDesc', label: '故障描述', type: 'textarea', required: true, minLength: 10, placeholder: '请详细描述故障现象',
};

const faultCauseField: WorkflowFieldSchema = {
  name: 'faultCause', label: '故障原因', type: 'textarea', placeholder: '分析故障原因（可选）',
};

const faultPhotosField: WorkflowFieldSchema = {
  name: 'faultPhotos', label: '故障照片', type: 'photo-upload',
};

const suggestedRepairPlanField: WorkflowFieldSchema = {
  name: 'suggestedRepairPlan', label: '建议维修方案', type: 'textarea', placeholder: '选填',
};

const needQuoteField: WorkflowFieldSchema = {
  name: 'needQuote', label: '需要报价', type: 'boolean',
};

const needPartsField: WorkflowFieldSchema = {
  name: 'needParts', label: '需要配件', type: 'boolean',
};

const needProcurementField: WorkflowFieldSchema = {
  name: 'needProcurement', label: '需要采购', type: 'boolean',
};

const repairSummaryField: WorkflowFieldSchema = {
  name: 'repairSummary', label: '维修总结', type: 'textarea', required: true, minLength: 5, placeholder: '请描述维修情况',
};

const repairItemsField: WorkflowFieldSchema = {
  name: 'repairItems', label: '维修项目', type: 'repair-item-list',
};

const partsUsedField: WorkflowFieldSchema = {
  name: 'partsUsed', label: '使用配件', type: 'part-list',
};

const chargesField: WorkflowFieldSchema = {
  name: 'charges', label: '收费项目', type: 'charge-list',
};

const afterPhotosField: WorkflowFieldSchema = {
  name: 'afterRepairPhotos', label: '维修后照片', type: 'photo-upload',
};

const warrantyField: WorkflowFieldSchema = {
  name: 'warrantyNote', label: '保修说明', type: 'textarea', placeholder: '保修期限、范围等（可选）',
};

// ── 5 Action Schemas ──

export const ACCEPT_WORK_ORDER: WorkOrderActionSchema = {
  key: 'ACCEPT_WORK_ORDER',
  label: '受理',
  fromStates: ['CREATED'],
  toState: 'ACCEPTED',
  permission: 'work_order:accept',
  api: '/work-orders/:id/accept',
  method: 'POST',
  fields: [priorityField, remarkField],
  buildPayload: buildAcceptPayload,
};

export const DISPATCH_OUTLET: WorkOrderActionSchema = {
  key: 'DISPATCH_OUTLET',
  label: '派网点',
  fromStates: ['ACCEPTED', 'OUTLET_ASSIGNED'],
  toState: 'OUTLET_ASSIGNED',
  permission: 'work_order:assign_outlet',
  api: '/work-orders/:id/assign-outlet',
  method: 'POST',
  fields: [outletIdField, dispatchReasonField, expectedArriveField],
  buildPayload: buildDispatchOutletPayload,
};

export const ASSIGN_ENGINEER: WorkOrderActionSchema = {
  key: 'ASSIGN_ENGINEER',
  label: '派工程师',
  fromStates: ['OUTLET_ASSIGNED', 'ENGINEER_ASSIGNED'],
  toState: 'ENGINEER_ASSIGNED',
  permission: 'work_order:assign_engineer',
  api: '/work-orders/:id/assign-engineer',
  method: 'POST',
  fields: [engineerIdField],
  buildPayload: buildAssignEngineerPayload,
};

export const CONFIRM_FAULT: WorkOrderActionSchema = {
  key: 'CONFIRM_FAULT',
  label: '确认故障',
  fromStates: ['SIGNED_IN'],
  toState: 'FAULT_CONFIRMED',
  permission: 'work_order:confirm_fault',
  api: '/work-orders/:id/confirm-fault',
  method: 'POST',
  fields: [faultTypeIdsField, faultDescField, faultCauseField, faultPhotosField, suggestedRepairPlanField, needQuoteField, needPartsField, needProcurementField],
  buildPayload: buildConfirmFaultPayload,
};

export const SUBMIT_RECEIPT: WorkOrderActionSchema = {
  key: 'SUBMIT_RECEIPT',
  label: '提交回执',
  fromStates: ['REPAIRING'],
  toState: 'PENDING_SIGNATURE',
  permission: 'work_order:submit_receipt',
  api: '/receipts',
  method: 'POST',
  fields: [repairSummaryField, repairItemsField, partsUsedField, chargesField, afterPhotosField, warrantyField],
  buildPayload: buildSubmitReceiptPayload,
};

// ── Lookup ──

export const WORK_ORDER_ACTIONS: Record<WorkOrderActionKey, WorkOrderActionSchema> = {
  ACCEPT_WORK_ORDER,
  DISPATCH_OUTLET,
  ASSIGN_ENGINEER,
  CONFIRM_FAULT,
  SUBMIT_RECEIPT,
};

export function getWorkOrderAction(actionKey: WorkOrderActionKey): WorkOrderActionSchema {
  return WORK_ORDER_ACTIONS[actionKey];
}

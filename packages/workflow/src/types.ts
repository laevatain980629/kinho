export type WorkOrderActionKey =
  | 'ACCEPT_WORK_ORDER'
  | 'DISPATCH_OUTLET'
  | 'ASSIGN_ENGINEER'
  | 'CONFIRM_FAULT'
  | 'SUBMIT_RECEIPT';

export type WorkflowFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'boolean'
  | 'multi-select'
  | 'datetime'
  | 'photo-upload'
  | 'outlet-select'
  | 'engineer-select'
  | 'part-list'
  | 'charge-list'
  | 'repair-item-list';

export type WorkflowOptionsSource =
  | 'static'
  | 'outlets'
  | 'engineers'
  | 'faultTypes'
  | 'parts';

export interface WorkflowOption {
  value: string | number | boolean;
  label: string;
}

export interface WorkflowFieldSchema {
  name: string;
  label: string;
  type: WorkflowFieldType;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  options?: WorkflowOption[];
  optionsSource?: WorkflowOptionsSource;
  visibleWhen?: {
    field: string;
    equals: unknown;
  };
}

export interface WorkOrderActionSchema<TPayload = unknown> {
  key: WorkOrderActionKey;
  label: string;
  fromStates: string[];
  toState?: string;
  permission: string;
  api: string;
  method: 'POST' | 'PATCH';
  fields: WorkflowFieldSchema[];
  buildPayload: (
    form: Record<string, unknown>,
    context: { workOrderId: number },
  ) => TPayload;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

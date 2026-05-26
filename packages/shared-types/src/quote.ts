export const QuoteState = {
  QUOTE_DRAFT: 'QUOTE_DRAFT',
  QUOTE_PENDING_APPROVAL: 'QUOTE_PENDING_APPROVAL',
  QUOTE_REJECTED: 'QUOTE_REJECTED',
  QUOTE_APPROVED: 'QUOTE_APPROVED',
  QUOTE_PENDING_CUSTOMER_CONFIRM: 'QUOTE_PENDING_CUSTOMER_CONFIRM',
  QUOTE_CUSTOMER_CONFIRMED: 'QUOTE_CUSTOMER_CONFIRMED',
  QUOTE_CUSTOMER_REJECTED: 'QUOTE_CUSTOMER_REJECTED',
  QUOTE_SUPERSEDED: 'QUOTE_SUPERSEDED',
  QUOTE_CANCELLED: 'QUOTE_CANCELLED',
} as const;

export type QuoteState = (typeof QuoteState)[keyof typeof QuoteState];

export const QUOTE_STATE_LABELS: Record<QuoteState, string> = {
  QUOTE_DRAFT: '草稿',
  QUOTE_PENDING_APPROVAL: '待审批',
  QUOTE_REJECTED: '已驳回',
  QUOTE_APPROVED: '已审批',
  QUOTE_PENDING_CUSTOMER_CONFIRM: '待客户确认',
  QUOTE_CUSTOMER_CONFIRMED: '客户已确认',
  QUOTE_CUSTOMER_REJECTED: '客户已拒绝',
  QUOTE_SUPERSEDED: '已被替代',
  QUOTE_CANCELLED: '已作废',
};

export interface QuoteListItem {
  id: number;
  quoteNo: string;
  workOrderId: number;
  workOrderNo: string;
  status: QuoteState;
  totalAmount: number;
  creatorName: string;
  createdAt: string;
}

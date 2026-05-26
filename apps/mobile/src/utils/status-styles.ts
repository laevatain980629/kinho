/** Shared status-to-SCSS-class mapping for staff-mobile pages. */
export const STATUS_BG: Record<string, string> = {
  DRAFT: 'bg-gray text-gray',
  PENDING: 'bg-amber text-amber',
  PENDING_APPROVAL: 'bg-amber text-amber',
  PENDING_SUPERVISOR: 'bg-amber text-amber',
  PENDING_PROCUREMENT: 'bg-blue text-blue',
  PENDING_CUSTOMER: 'bg-purple text-purple',
  APPROVED: 'bg-green text-green',
  CONFIRMED: 'bg-blue text-blue',
  CONFIRMED_RETURN: 'bg-green text-green',
  ORDERED: 'bg-blue text-blue',
  SHIPPED: 'bg-purple text-purple',
  RECEIVED: 'bg-green text-green',
  REJECTED: 'bg-red text-red',
  CANCELLED: 'bg-gray text-gray',
}

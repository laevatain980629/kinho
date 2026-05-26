export enum QuoteStatus {
  DRAFT = 'DRAFT',
  PENDING_SUPERVISOR = 'PENDING_SUPERVISOR',
  REJECTED = 'REJECTED',
  APPROVED = 'APPROVED',
  PENDING_CUSTOMER_CONFIRM = 'PENDING_CUSTOMER_CONFIRM',
  CUSTOMER_CONFIRMED = 'CUSTOMER_CONFIRMED',
  CUSTOMER_REJECTED = 'CUSTOMER_REJECTED',
  SUPERSEDED = 'SUPERSEDED',
  CANCELLED = 'CANCELLED',
}

/** Terminal states — no transitions allowed out of these */
const TERMINAL_STATES = new Set([
  QuoteStatus.CUSTOMER_CONFIRMED,
  QuoteStatus.CANCELLED,
  QuoteStatus.SUPERSEDED,
]);

/** States from which cancellation is allowed */
const CANCELLABLE_STATES = new Set([
  QuoteStatus.DRAFT,
  QuoteStatus.PENDING_SUPERVISOR,
  QuoteStatus.APPROVED,
  QuoteStatus.PENDING_CUSTOMER_CONFIRM,
]);

/**
 * Valid transitions:
 * DRAFT → PENDING_SUPERVISOR
 * PENDING_SUPERVISOR → APPROVED | REJECTED
 * APPROVED → PENDING_CUSTOMER_CONFIRM
 * PENDING_CUSTOMER_CONFIRM → CUSTOMER_CONFIRMED | CUSTOMER_REJECTED
 * CUSTOMER_REJECTED → PENDING_SUPERVISOR (re-submit)
 * Any cancellable → CANCELLED
 */
export function canQuoteTransition(from: string, to: string): boolean {
  const fromState = from as QuoteStatus;
  const toState = to as QuoteStatus;

  if (TERMINAL_STATES.has(fromState)) {
    return false;
  }

  if (toState === QuoteStatus.CANCELLED) {
    return CANCELLABLE_STATES.has(fromState);
  }

  if (toState === QuoteStatus.REJECTED) {
    return fromState === QuoteStatus.PENDING_SUPERVISOR;
  }

  const FORWARD_TRANSITIONS: Record<string, QuoteStatus> = {
    [QuoteStatus.DRAFT]: QuoteStatus.PENDING_SUPERVISOR,
    [QuoteStatus.PENDING_SUPERVISOR]: QuoteStatus.APPROVED,
    [QuoteStatus.APPROVED]: QuoteStatus.PENDING_CUSTOMER_CONFIRM,
    [QuoteStatus.PENDING_CUSTOMER_CONFIRM]: QuoteStatus.CUSTOMER_CONFIRMED,
    [QuoteStatus.CUSTOMER_REJECTED]: QuoteStatus.PENDING_SUPERVISOR,
    [QuoteStatus.REJECTED]: QuoteStatus.DRAFT,
  };

  return FORWARD_TRANSITIONS[from] === toState;
}

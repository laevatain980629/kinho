export enum WorkOrderState {
  CREATED = 'CREATED',
  ACCEPTED = 'ACCEPTED',
  OUTLET_ASSIGNED = 'OUTLET_ASSIGNED',
  ENGINEER_ASSIGNED = 'ENGINEER_ASSIGNED',
  SIGNED_IN = 'SIGNED_IN',
  FAULT_CONFIRMED = 'FAULT_CONFIRMED',
  REPAIRING = 'REPAIRING',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  REPAIR_COMPLETED = 'REPAIR_COMPLETED',
  FOLLOW_UP_PENDING = 'FOLLOW_UP_PENDING',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/** Forward transitions along the main flow */
const FORWARD_TRANSITIONS: Record<string, WorkOrderState> = {
  [WorkOrderState.CREATED]: WorkOrderState.ACCEPTED,
  [WorkOrderState.ACCEPTED]: WorkOrderState.OUTLET_ASSIGNED,
  [WorkOrderState.OUTLET_ASSIGNED]: WorkOrderState.ENGINEER_ASSIGNED,
  [WorkOrderState.ENGINEER_ASSIGNED]: WorkOrderState.SIGNED_IN,
  [WorkOrderState.SIGNED_IN]: WorkOrderState.FAULT_CONFIRMED,
  [WorkOrderState.FAULT_CONFIRMED]: WorkOrderState.REPAIRING,
  [WorkOrderState.REPAIRING]: WorkOrderState.PENDING_SIGNATURE,
  [WorkOrderState.PENDING_SIGNATURE]: WorkOrderState.REPAIR_COMPLETED,
  [WorkOrderState.REPAIR_COMPLETED]: WorkOrderState.FOLLOW_UP_PENDING,
  [WorkOrderState.FOLLOW_UP_PENDING]: WorkOrderState.CLOSED,
};

/** States from which cancellation is allowed */
const CANCELLABLE_STATES = new Set([
  WorkOrderState.CREATED,
  WorkOrderState.ACCEPTED,
  WorkOrderState.OUTLET_ASSIGNED,
  WorkOrderState.ENGINEER_ASSIGNED,
]);

/**
 * Check whether a transition from `from` to `to` is valid.
 *
 * Allowed transitions:
 * - Forward along the main flow (one step at a time)
 * - Cancellable states → CANCELLED
 * - FOLLOW_UP_PENDING → REPAIRING (return to repair on follow-up exception)
 */
export function canTransition(from: string, to: string): boolean {
  const fromState = from as WorkOrderState;
  const toState = to as WorkOrderState;

  // Re-assign within same state (just update fields, no state change)
  if (fromState === toState) return true;

  // 重开工单: CLOSED → FOLLOW_UP_PENDING
  if (fromState === WorkOrderState.CLOSED && toState === WorkOrderState.FOLLOW_UP_PENDING) {
    return true;
  }

  // Cannot transition from terminal states
  if (fromState === WorkOrderState.CANCELLED || fromState === WorkOrderState.CLOSED) {
    return false;
  }

  // Cancel
  if (toState === WorkOrderState.CANCELLED) {
    return CANCELLABLE_STATES.has(fromState);
  }

  // 回访异常退回维修
  if (fromState === WorkOrderState.FOLLOW_UP_PENDING && toState === WorkOrderState.REPAIRING) {
    return true;
  }

  // Forward step
  return FORWARD_TRANSITIONS[from] === toState;
}

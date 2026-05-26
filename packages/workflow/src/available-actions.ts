import type { WorkOrderActionSchema } from './types';
import { WORK_ORDER_ACTIONS } from './work-order-actions';

export interface AvailableActionsParams {
  state: string;
  permissions: string[];
  role?: string;
  isAssignedEngineer?: boolean;
  isOutletManagerForOrder?: boolean;
}

export function getAvailableWorkOrderActions(params: AvailableActionsParams): WorkOrderActionSchema[] {
  const { state, permissions, role, isAssignedEngineer, isOutletManagerForOrder } = params;
  const isAdmin = role === 'admin';

  return Object.values(WORK_ORDER_ACTIONS).filter((action) => {
    // State must match
    if (!action.fromStates.includes(state)) return false;

    // Admin bypasses permission + role checks
    if (isAdmin) return true;

    // Permission check
    if (!permissions.includes(action.permission)) return false;

    // Engineer-only actions: must be the assigned engineer
    if (action.key === 'CONFIRM_FAULT' || action.key === 'SUBMIT_RECEIPT') {
      if (!isAssignedEngineer) return false;
    }

    // Outlet-manager actions: must be the outlet manager for this order
    if (action.key === 'ASSIGN_ENGINEER') {
      if (!isOutletManagerForOrder) return false;
    }

    return true;
  });
}

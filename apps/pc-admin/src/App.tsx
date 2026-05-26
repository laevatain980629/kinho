import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import type React from 'react';
import { ErrorBoundary, ToastProvider, useTheme, PermissionProvider, RoutePermissionGuard } from '@kinho/shared-components';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import WorkOrderList from './pages/WorkOrderList';
import WorkOrderDetail from './pages/WorkOrderDetail';
import ReceptionPool from './pages/ReceptionPool';
import PickForm from './pages/PickForm';
import OutletList from './pages/OutletList';
import CustomerList from './pages/CustomerList';
import MachineList from './pages/MachineList';
import FaultTypeList from './pages/FaultTypeList';
import QuoteList from './pages/QuoteList';
import QuoteForm from './pages/QuoteForm';
import PartList from './pages/PartList';
import QuoteDetail from './pages/QuoteDetail';
import PartsRequestList from './pages/PartsRequestList';
import PartsRequestDetail from './pages/PartsRequestDetail';
import PartsReturnList from './pages/PartsReturnList';
import PartsReturnDetail from './pages/PartsReturnDetail';
import WarehouseList from './pages/WarehouseList';
import WarehouseDetail from './pages/WarehouseDetail';
import WarehouseTransfer from './pages/WarehouseTransfer';
import StockForm from './pages/StockForm';
import InventoryOverview from './pages/InventoryOverview';
import ProcurementList from './pages/ProcurementList';
import ProcurementDetail from './pages/ProcurementDetail';
import ProcurementForm from './pages/ProcurementForm';
import ReportsCenter from './pages/ReportsCenter';
import UserList from './pages/UserList';
import RolePermission from './pages/RolePermission';
import AuditLogList from './pages/AuditLogList';
import ApprovalCenter from './pages/ApprovalCenter';
import { shouldRedirectToMobile } from './utils/device';

function Guarded({ permissions, children }: { permissions: string | string[]; children: React.ReactNode }) {
  return <RoutePermissionGuard permissions={permissions}>{children}</RoutePermissionGuard>;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function MobileRedirect() {
  if (shouldRedirectToMobile()) {
    window.location.replace('/mobile-web/login');
    return null;
  }
  return null;
}

export default function App() {
  useTheme();
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

  return (
    <BrowserRouter basename={basename}>
      <ErrorBoundary>
        <ToastProvider>
          <PermissionProvider>
          <MobileRedirect />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AuthGuard><MainLayout /></AuthGuard>}>
              <Route path="/" element={<Navigate to="/work-orders" replace />} />
              <Route path="/dashboard" element={<Guarded permissions="menu:dashboard"><Dashboard /></Guarded>} />
              <Route path="/work-orders" element={<Guarded permissions="work_order:view"><WorkOrderList /></Guarded>} />
              <Route path="/work-orders/reception" element={<Guarded permissions="work_order:accept"><ReceptionPool /></Guarded>} />
              <Route path="/work-orders/:id" element={<Guarded permissions="work_order:view"><WorkOrderDetail /></Guarded>} />
              <Route path="/outlets" element={<Guarded permissions="menu:asset"><OutletList /></Guarded>} />
              <Route path="/customers" element={<Guarded permissions="menu:asset"><CustomerList /></Guarded>} />
              <Route path="/machines" element={<Guarded permissions="menu:asset"><MachineList /></Guarded>} />
              <Route path="/fault-types" element={<Guarded permissions="menu:asset"><FaultTypeList /></Guarded>} />
              <Route path="/parts" element={<Guarded permissions="menu:asset"><PartList /></Guarded>} />
              <Route path="/quotes" element={<Guarded permissions="menu:quote"><QuoteList /></Guarded>} />
              <Route path="/quotes/create" element={<Guarded permissions="menu:quote"><QuoteForm /></Guarded>} />
              <Route path="/quotes/:id" element={<Guarded permissions="menu:quote"><QuoteDetail /></Guarded>} />
              <Route path="/quotes/:id/edit" element={<Guarded permissions="menu:quote"><QuoteForm /></Guarded>} />
              <Route path="/procurements" element={<Guarded permissions="menu:procurement"><ProcurementList /></Guarded>} />
              <Route path="/procurements/create" element={<Guarded permissions="procurement:create"><ProcurementForm /></Guarded>} />
              <Route path="/procurements/:id" element={<Guarded permissions="procurement:view"><ProcurementDetail /></Guarded>} />
              <Route path="/procurements/:id/edit" element={<Guarded permissions="procurement:edit"><ProcurementForm /></Guarded>} />
              <Route path="/warehouse" element={<Guarded permissions="menu:inventory"><InventoryOverview /></Guarded>} />
              <Route path="/warehouse/pick" element={<Guarded permissions="parts:apply"><PickForm /></Guarded>} />
              <Route path="/warehouses" element={<Guarded permissions="menu:warehouse"><WarehouseList /></Guarded>} />
              <Route path="/warehouses/transfer" element={<Guarded permissions="warehouse:transfer"><WarehouseTransfer /></Guarded>} />
              <Route path="/warehouses/:id" element={<Guarded permissions={['menu:warehouse', 'menu:inventory']}><WarehouseDetail /></Guarded>} />
              <Route path="/warehouse/:id/stock-in" element={<Guarded permissions="warehouse:stock_manage"><StockForm /></Guarded>} />
              <Route path="/warehouse/:id/stock-out" element={<Guarded permissions="warehouse:stock_manage"><StockForm /></Guarded>} />
              <Route path="/parts-requests" element={<Guarded permissions="menu:parts_request"><PartsRequestList /></Guarded>} />
              <Route path="/parts-requests/:id" element={<Guarded permissions="parts:view"><PartsRequestDetail /></Guarded>} />
              <Route path="/parts-returns" element={<Guarded permissions="menu:parts_return"><PartsReturnList /></Guarded>} />
              <Route path="/parts-returns/:id" element={<Guarded permissions="parts:view"><PartsReturnDetail /></Guarded>} />
              <Route path="/approvals" element={<Guarded permissions="menu:approval"><ApprovalCenter /></Guarded>} />
              <Route path="/reports" element={<Guarded permissions="menu:report"><ReportsCenter /></Guarded>} />
              <Route path="/users" element={<Guarded permissions="system:user_manage"><UserList /></Guarded>} />
              <Route path="/roles" element={<Guarded permissions="system:role_manage"><RolePermission /></Guarded>} />
              <Route path="/audit-logs" element={<Guarded permissions="system:audit_log"><AuditLogList /></Guarded>} />
            </Route>
          </Routes>
          </PermissionProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

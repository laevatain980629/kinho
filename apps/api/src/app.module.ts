import { Module, Controller, Get } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { InventoryModule } from './inventory/inventory.module';
import { PartsRequestsModule } from './parts-requests/parts-requests.module';
import { PartsReturnsModule } from './parts-returns/parts-returns.module';
import { QuotesModule } from './quotes/quotes.module';
import { ProcurementModule } from './procurement/procurement.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { EscalationsModule } from './escalations/escalations.module';
import { FollowUpsModule } from './follow-ups/follow-ups.module';
import { ReportsModule } from './reports/reports.module';
import { OutletsModule } from './outlets/outlets.module';
import { CustomersModule } from './customers/customers.module';
import { MachinesModule } from './machines/machines.module';
import { CustomerRequestsModule } from './customer-requests/customer-requests.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { FaultTypesModule } from './fault-types/fault-types.module';
import { PartsModule } from './parts/parts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GeoModule } from './geo/geo.module';
import { PrismaService } from './prisma.service';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Controller('health')
export class HealthController {
  @Get()
  check() { return { status: 'ok', timestamp: new Date().toISOString() }; }
}

@Module({
  imports: [
    CommonModule,
    AuthModule, UsersModule, ApprovalsModule, WorkOrdersModule,
    WarehousesModule, InventoryModule, PartsRequestsModule, PartsReturnsModule,
    QuotesModule, ProcurementModule, AuditLogsModule, EscalationsModule,
    FollowUpsModule, ReportsModule,
    OutletsModule, CustomersModule, MachinesModule,
    CustomerRequestsModule, ReceiptsModule,
    FaultTypesModule, PartsModule, NotificationsModule, GeoModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { PartsRequestsService } from './parts-requests.service';
import { PartsRequestsController } from './parts-requests.controller';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [InventoryModule, WorkOrdersModule],
  controllers: [PartsRequestsController],
  providers: [PartsRequestsService, PrismaService],
  exports: [PartsRequestsService],
})
export class PartsRequestsModule {}

import { Module } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { PrismaService } from '../prisma.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [WorkOrdersModule, InventoryModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, PrismaService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}

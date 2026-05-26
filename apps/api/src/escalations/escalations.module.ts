import { Module } from '@nestjs/common';
import { EscalationsService } from './escalations.service';
import { EscalationsController } from './escalations.controller';
import { PrismaService } from '../prisma.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [WorkOrdersModule],
  controllers: [EscalationsController],
  providers: [EscalationsService, PrismaService],
  exports: [EscalationsService],
})
export class EscalationsModule {}

import { Module } from '@nestjs/common';
import { FollowUpsService } from './follow-ups.service';
import { FollowUpsController } from './follow-ups.controller';
import { PrismaService } from '../prisma.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [WorkOrdersModule],
  controllers: [FollowUpsController],
  providers: [FollowUpsService, PrismaService],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}

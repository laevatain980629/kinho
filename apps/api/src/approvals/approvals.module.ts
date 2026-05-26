import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { PrismaService } from '../prisma.service';
import { PartsRequestsModule } from '../parts-requests/parts-requests.module';

@Module({
  imports: [PartsRequestsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, PrismaService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}

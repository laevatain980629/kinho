import { Module } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ProcurementController],
  providers: [ProcurementService, PrismaService],
  exports: [ProcurementService],
})
export class ProcurementModule {}

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FaultTypesController } from './fault-types.controller';

@Module({
  controllers: [FaultTypesController],
  providers: [PrismaService],
})
export class FaultTypesModule {}

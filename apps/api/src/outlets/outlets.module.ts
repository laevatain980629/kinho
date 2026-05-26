import { Module } from '@nestjs/common';
import { OutletsService } from './outlets.service';
import { OutletsController } from './outlets.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [OutletsController],
  providers: [OutletsService, PrismaService],
  exports: [OutletsService],
})
export class OutletsModule {}

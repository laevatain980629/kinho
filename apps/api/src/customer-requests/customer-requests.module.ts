import { Module } from '@nestjs/common';
import { CustomerRequestsService } from './customer-requests.service';
import { CustomerRequestsController } from './customer-requests.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CustomerRequestsController],
  providers: [CustomerRequestsService, PrismaService],
  exports: [CustomerRequestsService],
})
export class CustomerRequestsModule {}

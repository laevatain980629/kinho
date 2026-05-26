import { Module } from '@nestjs/common';
import { PartsReturnsService } from './parts-returns.service';
import { PartsReturnsController } from './parts-returns.controller';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [PartsReturnsController],
  providers: [PartsReturnsService, PrismaService],
  exports: [PartsReturnsService],
})
export class PartsReturnsModule {}

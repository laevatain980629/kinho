import { Module } from '@nestjs/common';
import { PartsController } from './parts.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [PartsController],
  providers: [PrismaService],
})
export class PartsModule {}

import { Module, Global } from '@nestjs/common';
import { SequenceService } from './services/sequence.service';
import { PrismaService } from '../prisma.service';

@Global()
@Module({
  providers: [SequenceService, PrismaService],
  exports: [SequenceService],
})
export class CommonModule {}

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';

enum FollowUpStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  EXCEPTION = 'EXCEPTION',
}

@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name);

  constructor(
    private prisma: PrismaService,
    private workOrdersService: WorkOrdersService,
  ) {}

  private async generateFollowUpNo(): Promise<string> {
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const prefix = `FU-${datePart}-`;

    const last = await this.prisma.followUp.findFirst({
      where: { followUpNo: { startsWith: prefix } },
      orderBy: { followUpNo: 'desc' },
    });

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.followUpNo.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async findAll(params: {
    status?: string;
    specialistId?: number;
    workOrderId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const { status, specialistId, workOrderId, page = 1, pageSize = 20 } = params;

    const where: Prisma.FollowUpWhereInput = {};

    if (status) where.status = status;
    if (specialistId !== undefined) where.specialistId = specialistId;
    if (workOrderId !== undefined) where.workOrderId = workOrderId;

    const [list, total] = await Promise.all([
      this.prisma.followUp.findMany({
        include: { specialist: { select: { id: true, name: true } }, workOrder: { select: { id: true, orderNo: true } } },
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.followUp.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async findById(id: number) {
    const followUp = await this.prisma.followUp.findUnique({ where: { id } });
    if (!followUp) throw new NotFoundException('回访记录不存在');
    return followUp;
  }

  async create(data: { workOrderId: number; specialistId: number }) {
    const followUpNo = await this.generateFollowUpNo();

    return this.prisma.followUp.create({
      data: {
        followUpNo,
        workOrderId: data.workOrderId,
        specialistId: data.specialistId,
        status: FollowUpStatus.PENDING,
      },
    });
  }

  async complete(
    id: number,
    data: {
      contactResult: string;
      satisfaction: number;
      feedback?: string;
      needReopen?: boolean;
      operatorId?: number;
      operatorName?: string;
      operatorRole?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.findUnique({ where: { id } });
      if (!followUp) throw new NotFoundException('回访记录不存在');

      if (followUp.status !== FollowUpStatus.PENDING) {
        throw new BadRequestException(`无法完成回访: 当前状态为 ${followUp.status}`);
      }

      const updated = await tx.followUp.update({
        where: { id },
        data: {
          status: FollowUpStatus.COMPLETED,
          contactResult: data.contactResult,
          satisfaction: data.satisfaction,
          feedback: data.feedback,
          needReopen: data.needReopen ?? false,
          completedAt: new Date(),
        },
      });

      // 回访完成且不需要重开 → 自动关闭工单。关闭失败必须回滚并返回给前端。
      if (!data.needReopen) {
        await this.workOrdersService.close(
          followUp.workOrderId,
          data.operatorId,
          data.operatorName,
          data.operatorRole,
          tx,
        );
      }

      return updated;
    });
  }

  async reportException(id: number, data: { type: string; note: string }) {
    const followUp = await this.findById(id);

    if (followUp.status !== FollowUpStatus.PENDING) {
      throw new BadRequestException(`无法上报异常: 当前状态为 ${followUp.status}`);
    }

    return this.prisma.followUp.update({
      where: { id },
      data: {
        status: FollowUpStatus.EXCEPTION,
        exceptionType: data.type,
        exceptionNote: data.note,
        exceptionAt: new Date(),
      },
    });
  }
}

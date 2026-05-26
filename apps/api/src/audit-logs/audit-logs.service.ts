import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    userId?: number;
    action?: string;
    module?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const { userId, action, module, dateFrom, dateTo, page = 1, pageSize = 20 } = params;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId !== undefined) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (module) {
      where.module = module;
    }

    if (dateFrom || dateTo) {
      where.occurredAt = {};
      if (dateFrom) {
        where.occurredAt.gte = dateFrom;
      }
      if (dateTo) {
        where.occurredAt.lte = dateTo;
      }
    }

    const [list, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async findById(id: number) {
    const auditLog = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!auditLog) {
      throw new NotFoundException('审计日志不存在');
    }
    return auditLog;
  }
}

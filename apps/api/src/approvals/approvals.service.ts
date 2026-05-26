import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PartsRequestsService } from '../parts-requests/parts-requests.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaService,
    private partsRequestsService: PartsRequestsService,
  ) {}

  async findAll(params: { type?: string; status?: string; approverId?: number; page?: number; pageSize?: number }) {
    const { type, status, approverId, page = 1, pageSize = 20 } = params;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (approverId) where.approverId = approverId;
    const [list, total] = await Promise.all([
      this.prisma.approval.findMany({ where, include: { applicant: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.approval.count({ where }),
    ]);
    return { list: (list as any[]).map((a: any) => ({ ...a, applicantName: a.applicant?.name || null, approverName: a.approver?.name || null })), total, page, pageSize };
  }

  async approve(id: number, approverId: number, approverName: string) {
    const approval = await this.prisma.approval.findUnique({ where: { id } });
    if (!approval) throw new NotFoundException('审批记录不存在');
    if (approval.status !== 'PENDING') throw new BadRequestException('该审批已处理');

    // Drive source order status through domain services so inventory side effects stay consistent.
    if (approval.type === 'PARTS_REQUEST') {
      await this.partsRequestsService.approve(approval.sourceId, approverId, approverName, { sub: approverId });
    } else if (approval.type === 'QUOTE') {
      await this.prisma.quote.update({ where: { id: approval.sourceId }, data: { status: 'CONFIRMED' } });
    }

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approverId,
        summary: `${approval.summary} (审批人: ${approverName})`,
        resolvedAt: new Date(),
      },
    });

    return updated;
  }

  async reject(id: number, approverId: number, rejectReason: string) {
    const approval = await this.prisma.approval.findUnique({ where: { id } });
    if (!approval) throw new NotFoundException('审批记录不存在');
    if (approval.status !== 'PENDING') throw new BadRequestException('该审批已处理');

    if (approval.type === 'PARTS_REQUEST') {
      await this.partsRequestsService.reject(approval.sourceId, rejectReason, { sub: approverId });
    }

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approverId,
        rejectReason,
        resolvedAt: new Date(),
      },
    });

    return updated;
  }
}

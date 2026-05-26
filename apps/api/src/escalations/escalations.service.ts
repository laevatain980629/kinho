import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';

enum EscalationStatus {
  PENDING_SUPERVISOR = 'PENDING_SUPERVISOR',
  REJECTED = 'REJECTED',
  PENDING_CHIEF = 'PENDING_CHIEF',
  ACCEPTED = 'ACCEPTED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Injectable()
export class EscalationsService {
  constructor(
    private prisma: PrismaService,
    private workOrdersService: WorkOrdersService,
  ) {}

  private async generateEscalationNo(): Promise<string> {
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const prefix = `ESC-${datePart}-`;

    const last = await this.prisma.escalation.findFirst({
      where: { escalationNo: { startsWith: prefix } },
      orderBy: { escalationNo: 'desc' },
    });

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.escalationNo.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async findAll(params: {
    status?: string;
    workOrderId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const { status, workOrderId, page = 1, pageSize = 20 } = params;

    const where: Prisma.EscalationWhereInput = {};

    if (status) where.status = status;
    if (workOrderId !== undefined) where.workOrderId = workOrderId;

    const [list, total] = await Promise.all([
      this.prisma.escalation.findMany({
        include: { applicant: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } }, workOrder: { select: { id: true, orderNo: true } } },
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.escalation.count({ where }),
    ]);

    return { list: (list as any[]).map((e: any) => ({ ...e, applicantName: e.applicant?.name || null, approverName: e.approver?.name || null, workOrderNo: e.workOrder?.orderNo || null })), total, page, pageSize };
  }

  async findById(id: number) {
    const escalation = await this.prisma.escalation.findUnique({ where: { id } });
    if (!escalation) throw new NotFoundException('升级记录不存在');
    return escalation;
  }

  // 发起升级 → PENDING_SUPERVISOR
  async create(data: { workOrderId: number; reason: string; applicantId: number; applicantName?: string; applicantRole?: string }) {
    const escalationNo = await this.generateEscalationNo();

    await this.workOrdersService.hold(
      data.workOrderId,
      `升级申请: ${data.reason}`,
      data.applicantId,
      data.applicantName,
      data.applicantRole,
    );

    const escalation = await this.prisma.escalation.create({
      data: {
        escalationNo,
        workOrderId: data.workOrderId,
        reason: data.reason,
        status: EscalationStatus.PENDING_SUPERVISOR,
        applicantId: data.applicantId,
      },
    });

    // 同步创建审批记录，让主管在审批中心看到
    await this.prisma.approval.create({
      data: {
        type: 'WORK_ORDER_ESCALATION',
        sourceId: escalation.id,
        sourceNo: escalationNo,
        summary: data.reason,
        applicantId: data.applicantId,
        status: 'PENDING',
      },
    });

    return escalation;
  }

  // 主管审批通过 → 转总工处理 PENDING_CHIEF
  async approveBySupervisor(id: number, approverId: number) {
    const escalation = await this.findById(id);

    if (escalation.status !== EscalationStatus.PENDING_SUPERVISOR) {
      throw new BadRequestException(`无法审批: 当前状态为 ${escalation.status}`);
    }

    // 查找总工用户并指派到工单（总工跨网点，直接更新 engineerId）
    const chiefEngineer = await this.prisma.user.findFirst({
      where: { role: 'chief_engineer', status: 'ACTIVE' },
    });
    if (chiefEngineer) {
      const wo = await this.prisma.workOrder.findUnique({ where: { id: escalation.workOrderId }, select: { state: true } });
      await this.prisma.workOrder.update({
        where: { id: escalation.workOrderId },
        data: { engineerId: chiefEngineer.id, state: 'ENGINEER_ASSIGNED', engineerAssignedAt: new Date() },
      });
      // 补一条历史记录（因为没走 assignEngineer 方法）
      await this.prisma.workOrderHistory.create({
        data: {
          workOrderId: escalation.workOrderId,
          action: 'ENGINEER_ASSIGNED',
          fromState: wo?.state || 'OUTLET_ASSIGNED',
          toState: 'ENGINEER_ASSIGNED',
          operatorId: approverId,
          payload: JSON.stringify({ assignedEngineerName: chiefEngineer.name }),
        },
      });
    }

    return this.prisma.escalation.update({
      where: { id },
      data: { status: EscalationStatus.PENDING_CHIEF, approverId },
    });
  }

  // 主管驳回 → REJECTED，解除工单阻塞
  async reject(id: number, approverId: number, reason: string) {
    const escalation = await this.findById(id);

    if (escalation.status !== EscalationStatus.PENDING_SUPERVISOR) {
      throw new BadRequestException(`无法拒绝: 当前状态为 ${escalation.status}`);
    }

    await this.workOrdersService.unhold(escalation.workOrderId, approverId);

    return this.prisma.escalation.update({
      where: { id },
      data: {
        status: EscalationStatus.REJECTED,
        approverId,
        rejectReason: reason,
        resolvedAt: new Date(),
      },
    });
  }

  // 总工接受处理 → ACCEPTED
  async acceptByChief(id: number, chiefId: number) {
    const escalation = await this.findById(id);

    if (escalation.status !== EscalationStatus.PENDING_CHIEF) {
      throw new BadRequestException(`无法接受: 当前状态为 ${escalation.status}`);
    }

    return this.prisma.escalation.update({
      where: { id },
      data: { status: EscalationStatus.ACCEPTED, resolvedBy: chiefId },
    });
  }

  // 总工处理完成 → RESOLVED，解除工单阻塞
  async resolve(id: number, resolution: string, attachments?: { url: string; name: string; size?: number }[], resolvedBy?: number) {
    const escalation = await this.findById(id);

    if (escalation.status !== EscalationStatus.ACCEPTED && escalation.status !== EscalationStatus.PENDING_CHIEF) {
      throw new BadRequestException(`无法处理: 当前状态为 ${escalation.status}`);
    }

    await this.workOrdersService.unhold(escalation.workOrderId, resolvedBy);

    return this.prisma.escalation.update({
      where: { id },
      data: {
        status: EscalationStatus.RESOLVED,
        resolution,
        attachments: attachments || undefined,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });
  }

  // 关闭升级单 → CLOSED
  async close(id: number) {
    const escalation = await this.findById(id);

    if (escalation.status !== EscalationStatus.RESOLVED) {
      throw new BadRequestException(`无法关闭: 当前状态为 ${escalation.status}`);
    }

    return this.prisma.escalation.update({
      where: { id },
      data: { status: EscalationStatus.CLOSED },
    });
  }
}

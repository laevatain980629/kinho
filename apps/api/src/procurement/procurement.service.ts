import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

enum ProcurementStatus {
  DRAFT = 'DRAFT',
  PENDING_QUOTE = 'PENDING_QUOTE',
  QUOTED = 'QUOTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

const TERMINAL_STATUSES = new Set([
  ProcurementStatus.RECEIVED,
  ProcurementStatus.REJECTED,
  ProcurementStatus.CANCELLED,
]);

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService) {}

  private async generateProcurementNo(): Promise<string> {
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const prefix = `PO-${datePart}-`;

    const last = await this.prisma.procurementRequest.findFirst({
      where: { procurementNo: { startsWith: prefix } },
      orderBy: { procurementNo: 'desc' },
    });

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.procurementNo.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async findAll(params: {
    keyword?: string;
    status?: string;
    workOrderId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const { keyword, status, workOrderId, page = 1, pageSize = 20 } = params;

    const where: Prisma.ProcurementRequestWhereInput = {};

    if (keyword) where.OR = [{ procurementNo: { contains: keyword } }];
    if (status) where.status = status;
    if (workOrderId !== undefined) where.workOrderId = workOrderId;

    const [list, total] = await Promise.all([
      this.prisma.procurementRequest.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          workOrder: { select: { id: true, orderNo: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.procurementRequest.count({ where }),
    ]);

    return {
      list: list.map((p: any) => ({ ...p, supplierName: p.supplier?.name || null, workOrderNo: p.workOrder?.orderNo || null })),
      total, page, pageSize,
    };
  }

  async findById(id: number) {
    const p: any = await this.prisma.procurementRequest.findUnique({
      where: { id },
      include: { supplier: true, workOrder: { select: { id: true, orderNo: true } } },
    });
    if (!p) throw new NotFoundException('采购申请不存在');
    return { ...p, supplierName: p.supplier?.name || null, workOrderNo: p.workOrder?.orderNo || null };
  }

  async create(data: {
    workOrderId?: number;
    quoteId?: number;
    supplierId: number;
    estimatedCost: number;
  }) {
    const procurementNo = await this.generateProcurementNo();

    return this.prisma.procurementRequest.create({
      data: {
        procurementNo,
        workOrderId: data.workOrderId,
        quoteId: data.quoteId,
        supplierId: data.supplierId,
        estimatedCost: data.estimatedCost,
        status: ProcurementStatus.DRAFT,
      },
    });
  }

  // DRAFT → PENDING_QUOTE
  async requestQuote(id: number) {
    return this.transition(id, ProcurementStatus.DRAFT, ProcurementStatus.PENDING_QUOTE, '发起询价');
  }

  // PENDING_QUOTE → QUOTED
  async submitQuote(id: number) {
    return this.transition(id, ProcurementStatus.PENDING_QUOTE, ProcurementStatus.QUOTED, '提交报价');
  }

  // QUOTED → PENDING_APPROVAL
  async submitApproval(id: number) {
    return this.transition(id, ProcurementStatus.QUOTED, ProcurementStatus.PENDING_APPROVAL, '提交审批');
  }

  // DRAFT → PENDING_APPROVAL (直接提交审批，跳过询价)
  async submitApprovalDirect(id: number) {
    return this.transition(id, ProcurementStatus.DRAFT, ProcurementStatus.PENDING_APPROVAL, '提交审批');
  }

  // PENDING_APPROVAL → APPROVED
  async approve(id: number) {
    return this.transition(id, ProcurementStatus.PENDING_APPROVAL, ProcurementStatus.APPROVED, '审批通过');
  }

  // PENDING_APPROVAL → REJECTED
  async reject(id: number, reason?: string) {
    return this.transition(id, ProcurementStatus.PENDING_APPROVAL, ProcurementStatus.REJECTED, reason || '审批驳回');
  }

  // APPROVED → ORDERED
  async order(id: number) {
    return this.transition(id, ProcurementStatus.APPROVED, ProcurementStatus.ORDERED, '下单');
  }

  // ORDERED → PARTIALLY_RECEIVED
  async partialReceive(id: number) {
    return this.transition(id, ProcurementStatus.ORDERED, ProcurementStatus.PARTIALLY_RECEIVED, '部分到货');
  }

  // ORDERED/PARTIALLY_RECEIVED → RECEIVED
  async receive(id: number) {
    const procurement = await this.findById(id);
    if (procurement.status !== ProcurementStatus.ORDERED && procurement.status !== ProcurementStatus.PARTIALLY_RECEIVED) {
      throw new BadRequestException(`无法收货: 当前状态为 ${procurement.status}`);
    }

    return this.prisma.procurementRequest.update({
      where: { id },
      data: { status: ProcurementStatus.RECEIVED },
    });
  }

  // 非终态 → CANCELLED
  async cancel(id: number) {
    const procurement = await this.findById(id);
    if (TERMINAL_STATUSES.has(procurement.status as ProcurementStatus)) {
      throw new BadRequestException(`无法取消: 当前状态 ${procurement.status} 已为终态`);
    }

    return this.prisma.procurementRequest.update({
      where: { id },
      data: { status: ProcurementStatus.CANCELLED },
    });
  }

  private async transition(id: number, from: ProcurementStatus, to: ProcurementStatus, action: string) {
    const procurement = await this.findById(id);
    if (procurement.status !== from) {
      throw new BadRequestException(`无法${action}: 当前状态为 ${procurement.status}, 期望为 ${from}`);
    }

    return this.prisma.procurementRequest.update({
      where: { id },
      data: { status: to },
    });
  }
  async delete(id: number) { return this.prisma.procurementRequest.update({ where: { id }, data: { status: "CANCELLED" } }); }

  async resubmit(id: number) {
    const procurement = await this.findById(id);
    if (procurement.status !== 'REJECTED') {
      throw new BadRequestException(`无法重新提交: 当前状态为 ${procurement.status}`);
    }
    return this.prisma.procurementRequest.update({ where: { id }, data: { status: 'DRAFT' } });
  }

  async update(id: number, data: { supplierId?: number; estimatedCost?: number }) {
    const procurement = await this.findById(id);
    if (procurement.status !== 'DRAFT') {
      throw new BadRequestException('只有草稿状态的采购单可以编辑');
    }
    const updateData: any = {};
    if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
    if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost;
    return this.prisma.procurementRequest.update({ where: { id }, data: updateData });
  }
}

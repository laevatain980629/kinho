import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { QuoteStatus, canQuoteTransition } from '../common/enums/quote-states';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  private async generateQuoteNo(): Promise<string> {
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const prefix = `QT-${datePart}-`;

    const last = await this.prisma.quote.findFirst({
      where: { quoteNo: { startsWith: prefix } },
      orderBy: { quoteNo: 'desc' },
    });

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.quoteNo.slice(prefix.length), 10);
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

    const where: Prisma.QuoteWhereInput = {};

    if (keyword) {
      where.OR = [{ quoteNo: { contains: keyword } }];
    }
    if (status) where.status = status;
    if (workOrderId !== undefined) where.workOrderId = workOrderId;

    const [list, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        include: {
          workOrder: { select: { id: true, orderNo: true } },
          creator: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      list: list.map((q: any) => ({ ...q, workOrderNo: q.workOrder?.orderNo || null, createdBy: q.creator?.name || null })),
      total, page, pageSize,
    };
  }

  async findById(id: number) {
    const quote: any = await this.prisma.quote.findUnique({
      where: { id },
      include: { workOrder: { select: { id: true, orderNo: true } }, creator: { select: { id: true, name: true } } },
    });
    if (!quote) throw new NotFoundException('报价单不存在');
    return { ...quote, workOrderNo: quote.workOrder?.orderNo || null, createdBy: quote.creator?.name || null };
  }

  async create(data: { workOrderId: number; totalAmount: number; creatorId?: number }) {
    const quoteNo = await this.generateQuoteNo();

    return this.prisma.quote.create({
      data: {
        quoteNo,
        status: QuoteStatus.DRAFT,
        workOrderId: data.workOrderId,
        totalAmount: new Prisma.Decimal(data.totalAmount),
        creatorId: data.creatorId || undefined,
      },
    });
  }

  private async transition(id: number, toStatus: QuoteStatus, extraData?: Record<string, unknown>) {
    const quote = await this.findById(id);

    if (!canQuoteTransition(quote.status, toStatus)) {
      throw new BadRequestException(
        `报价单状态流转无效: ${quote.status} -> ${toStatus}`,
      );
    }

    return this.prisma.quote.update({
      where: { id },
      data: {
        status: toStatus,
        ...extraData,
      },
    });
  }

  // --- Shortcut methods ---

  submit(id: number) {
    return this.transition(id, QuoteStatus.PENDING_SUPERVISOR);
  }

  approve(id: number) {
    return this.transition(id, QuoteStatus.APPROVED);
  }

  sendToCustomer(id: number) {
    return this.transition(id, QuoteStatus.PENDING_CUSTOMER_CONFIRM);
  }

  reject(id: number, reason: string) {
    return this.transition(id, QuoteStatus.REJECTED, { rejectReason: reason });
  }

  recordCustomerConfirm(id: number) {
    return this.transition(id, QuoteStatus.CUSTOMER_CONFIRMED);
  }

  recordCustomerReject(id: number, reason?: string) {
    return this.transition(id, QuoteStatus.CUSTOMER_REJECTED, { rejectReason: reason });
  }

  cancel(id: number) {
    return this.transition(id, QuoteStatus.CANCELLED);
  }
  async delete(id: number) { return this.prisma.quote.update({ where: { id }, data: { status: "CANCELLED" } }); }

  async resubmit(id: number) {
    const quote = await this.findById(id);
    if (quote.status !== QuoteStatus.REJECTED && quote.status !== QuoteStatus.CUSTOMER_REJECTED) {
      throw new BadRequestException(`无法重新提交: 当前状态为 ${quote.status}`);
    }
    const targetStatus = quote.status === QuoteStatus.CUSTOMER_REJECTED
      ? QuoteStatus.PENDING_SUPERVISOR
      : QuoteStatus.DRAFT;
    return this.transition(id, targetStatus);
  }

  async update(id: number, data: { laborCost?: number; totalAmount?: number; remark?: string; items?: Array<{ partId?: number; partNo: string; partName: string; partModel: string; quantity: number; unitPrice: number; amount: number }> }) {
    const quote = await this.findById(id);
    if (quote.status !== 'DRAFT') {
      throw new BadRequestException('只有草稿状态的报价单可以编辑');
    }

    const updateData: any = {};
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.remark !== undefined) updateData.note = data.remark;

    // Store items as JSON in partItems column
    if (data.items) {
      updateData.partItems = JSON.stringify(data.items);
    }

    return this.prisma.quote.update({ where: { id }, data: updateData });
  }
}

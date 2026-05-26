import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MachinesService {
  constructor(private prisma: PrismaService) {}

  private toDate(value?: string | Date | null) {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private addMonths(date: Date, months: number) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private buildWarrantyData(data: MachineWriteData): Prisma.MachineUncheckedCreateInput {
    const purchaseDate = this.toDate(data.purchaseDate);
    const warrantyStartDate = this.toDate(data.warrantyStartDate) || purchaseDate;
    const warrantyMonths = data.warrantyMonths != null ? Number(data.warrantyMonths) : 12;
    const warrantyEndDate = this.toDate(data.warrantyEndDate || data.warrantyExpiry)
      || (warrantyStartDate ? this.addMonths(warrantyStartDate, warrantyMonths) : undefined);

    return {
      serialNo: data.serialNo,
      machineCode: data.machineCode,
      brand: data.brand,
      model: data.model,
      type: data.type,
      customerId: data.customerId,
      outletId: data.outletId,
      currentHours: data.currentHours != null ? Number(data.currentHours) : data.currentHours,
      purchaseDate,
      warrantyStartDate,
      warrantyEndDate,
      warrantyMonths,
      warrantyPolicy: data.warrantyPolicy,
      warrantyRemark: data.warrantyRemark,
      status: data.status,
    };
  }

  async findAll(params: { keyword?: string; customerId?: number; outletId?: number; status?: string; page?: number; pageSize?: number }) {
    const { keyword, customerId, outletId, status, page = 1, pageSize = 20 } = params;
    const where: Prisma.MachineWhereInput = {};

    if (keyword) {
      where.OR = [
        { serialNo: { contains: keyword } },
        { brand: { contains: keyword } },
        { model: { contains: keyword } },
        { machineCode: { contains: keyword } },
      ];
    }
    if (customerId) where.customerId = customerId;
    if (outletId) where.outletId = outletId;
    where.status = status || 'ACTIVE';

    const [list, total] = await Promise.all([
      this.prisma.machine.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.machine.count({ where }),
    ]);

    return { list: (list as any[]).map(m => ({ ...m, customerName: m.customer?.name || null, outletName: m.outlet?.name || null })), total, page, pageSize };
  }

  async findById(id: number) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } },
        workOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!machine) throw new NotFoundException('机台不存在');
    return machine;
  }

  async create(data: MachineWriteData) {
    return this.prisma.machine.create({ data: this.buildWarrantyData(data) });
  }

  async update(id: number, data: Partial<MachineWriteData>) {
    await this.findById(id);
    const updateData = this.buildWarrantyData(data as MachineWriteData);
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });
    return this.prisma.machine.update({ where: { id }, data: updateData });
  }

  async generateQrCode(id: number) {
    const machine = await this.findById(id);
    const qrCode = `MACHINE:${machine.serialNo}:${id}`;
    return this.prisma.machine.update({
      where: { id },
      data: { qrCode },
    });
  }
  async delete(id: number) { return this.prisma.machine.update({ where: { id }, data: { status: "INACTIVE" } }); }
}

type MachineWriteData = {
  serialNo: string;
  machineCode?: string;
  brand?: string;
  model: string;
  type?: string;
  customerId: number;
  outletId?: number;
  currentHours?: number | string | null;
  purchaseDate?: string | Date | null;
  warrantyStartDate?: string | Date | null;
  warrantyEndDate?: string | Date | null;
  warrantyExpiry?: string | Date | null;
  warrantyMonths?: number | string | null;
  warrantyPolicy?: string;
  warrantyRemark?: string;
  status?: string;
};

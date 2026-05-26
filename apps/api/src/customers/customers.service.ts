import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private mapCustomer(customer: any) {
    return {
      ...customer,
      companyName: customer.name,
      contactPerson: customer.contactName,
      phone: customer.contactPhone,
      outletName: customer.outlet?.name || customer.outletName || null,
    };
  }

  async findAll(params: {
    keyword?: string;
    outletId?: number;
    status?: string;
    page?: number;
    pageSize?: number;
    operatorId?: number;
    operatorRole?: string;
  }) {
    const { keyword, outletId, status, page = 1, pageSize = 20, operatorId, operatorRole } = params;
    const where: Prisma.CustomerWhereInput = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { contactName: { contains: keyword } },
        { contactPhone: { contains: keyword } },
      ];
    }
    if (outletId !== undefined) where.outletId = outletId;

    if (operatorRole === 'outlet_manager') {
      const user = operatorId
        ? await this.prisma.user.findUnique({ where: { id: operatorId }, select: { outletId: true } })
        : null;
      if (user?.outletId) {
        where.outletId = user.outletId;
      }
    }

    where.status = status || 'ACTIVE';

    const [list, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: { outlet: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { list: list.map((c: any) => this.mapCustomer(c)), total, page, pageSize };
  }

  async findById(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { outlet: { select: { id: true, name: true } }, machines: true },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    return this.mapCustomer(customer);
  }

  async create(data: { name: string; contactName?: string; contactPhone: string; outletId: number; address?: string; customerType?: string; remark?: string }) {
    const customer = await this.prisma.customer.create({ data, include: { outlet: { select: { id: true, name: true } } } });
    return this.mapCustomer(customer);
  }

  async update(id: number, data: { name?: string; contactName?: string; contactPhone?: string; address?: string; customerType?: string; remark?: string }) {
    await this.findById(id);
    const customer = await this.prisma.customer.update({ where: { id }, data, include: { outlet: { select: { id: true, name: true } } } });
    return this.mapCustomer(customer);
  }

  async transfer(id: number, outletId: number) {
    const customer = await this.findById(id);
    const updated = await this.prisma.customer.update({ where: { id: customer.id }, data: { outletId }, include: { outlet: { select: { id: true, name: true } } } });
    return this.mapCustomer(updated);
  }

  async findAllSimple() {
    const customers = await this.prisma.customer.findMany({
      where: { status: 'ACTIVE' },
      include: { outlet: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    return customers.map((customer) => this.mapCustomer(customer));
  }
  async delete(id: number) {
    const customer = await this.prisma.customer.update({ where: { id }, data: { status: 'INACTIVE' }, include: { outlet: { select: { id: true, name: true } } } });
    return this.mapCustomer(customer);
  }
}

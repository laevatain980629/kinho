import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OutletsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { keyword?: string; status?: string; page?: number; pageSize?: number }) {
    const { keyword, status, page = 1, pageSize = 20 } = params;
    const where: Prisma.OutletWhereInput = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { address: { contains: keyword } },
      ];
    }
    where.status = status || 'ACTIVE';

    const [list, total] = await Promise.all([
      this.prisma.outlet.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.outlet.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async findById(id: number) {
    const outlet = await this.prisma.outlet.findUnique({ where: { id } });
    if (!outlet) throw new NotFoundException('网点不存在');
    return outlet;
  }

  async create(data: { name: string; code?: string; address?: string; phone?: string; manager?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.create({
        data: {
          name: data.name,
          code: data.code || 'OUT-' + Date.now(),
          address: data.address,
          phone: data.phone,
          manager: data.manager,
        },
      });

      await tx.warehouse.create({
        data: {
          warehouseNo: `WH-OUTLET-${String(outlet.id).padStart(4, '0')}`,
          name: `${outlet.name}\u7f51\u70b9\u4ed3`,
          type: 'OUTLET_WAREHOUSE',
          outletId: outlet.id,
          outletName: outlet.name,
          status: 'ACTIVE',
        },
      });

      return outlet;
    });
  }

  async update(id: number, data: { name?: string; address?: string; phone?: string; manager?: string }) {
    await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.update({ where: { id }, data });
      await tx.warehouse.updateMany({
        where: { outletId: id },
        data: { outletName: outlet.name },
      });
      await tx.warehouse.updateMany({
        where: { outletId: id, type: 'OUTLET_WAREHOUSE' },
        data: { name: `${outlet.name}\u7f51\u70b9\u4ed3` },
      });
      const warehouses = await tx.warehouse.findMany({
        where: { outletId: id },
        select: { id: true, name: true },
      });
      for (const warehouse of warehouses) {
        await tx.inventoryBalance.updateMany({
          where: { warehouseId: warehouse.id },
          data: { warehouseName: warehouse.name },
        });
      }
      return outlet;
    });
  }

  async remove(id: number) {
    await this.findById(id);
    return this.prisma.outlet.update({ where: { id }, data: { status: 'DISABLED' } });
  }

  async toggleStatus(id: number) {
    const outlet = await this.findById(id);
    return this.prisma.outlet.update({
      where: { id },
      data: { status: outlet.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
    });
  }
  async findAllSimple() { return this.prisma.outlet.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } }); }
  async delete(id: number) { return this.prisma.outlet.update({ where: { id }, data: { status: 'INACTIVE' } }); }
}

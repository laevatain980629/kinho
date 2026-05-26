import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type WarehouseInput = {
  name: string;
  type: string;
  outletId?: number | null;
  outletName?: string | null;
  ownerEngineerId?: number | null;
  ownerEngineerName?: string | null;
  k3WarehouseCode?: string | null;
  status?: string;
};

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  private async buildScopeWhere(user?: { sub: number; role?: string }) {
    if (!user || ['admin', 'warehouse', 'hq_service', 'supervisor', 'chief_engineer', 'procurement'].includes(user.role || '')) {
      return {};
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { outletId: true },
    });

    if (user.role === 'engineer') {
      return {
        OR: [
          { type: 'ENGINEER_WAREHOUSE', ownerEngineerId: user.sub },
          ...(currentUser?.outletId ? [{ type: 'OUTLET_WAREHOUSE', outletId: currentUser.outletId }] : []),
        ],
      };
    }

    if (user.role === 'outlet_manager' && currentUser?.outletId) {
      return { outletId: currentUser.outletId };
    }

    return { id: -1 };
  }

  async findAll(params: { keyword?: string; type?: string; status?: string; page?: number; pageSize?: number }, user?: { sub: number; role?: string }) {
    const { keyword, type, status, page = 1, pageSize = 20 } = params;
    const where: any = await this.buildScopeWhere(user);
    if (keyword) {
      const keywordOr = [
        { name: { contains: keyword } },
        { warehouseNo: { contains: keyword } },
      ];
      where.AND = [...(where.AND || []), { OR: keywordOr }];
    }
    if (type) where.type = type;
    where.status = status || 'ACTIVE';
    const [list, total] = await Promise.all([
      this.prisma.warehouse.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.warehouse.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async findById(id: number, user?: { sub: number; role?: string }) {
    const scope = await this.buildScopeWhere(user);
    if (scope && Object.keys(scope).length > 0) {
      const warehouse = await this.prisma.warehouse.findFirst({ where: { id, AND: [scope] } });
      if (!warehouse) throw new NotFoundException('仓库不存在');
      return warehouse;
    }

    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException('仓库不存在');
    return warehouse;
  }

  private validateWarehouseData(data: { type?: string; outletId?: number | null; ownerEngineerId?: number | null; k3WarehouseCode?: string | null }) {
    if (data.type === 'OUTLET_WAREHOUSE' && !data.outletId) {
      throw new BadRequestException('网点仓必须绑定网点');
    }
    if (data.type === 'ENGINEER_WAREHOUSE' && (!data.ownerEngineerId || !data.outletId)) {
      throw new BadRequestException('个人仓必须绑定工程师和所属网点');
    }
    if (data.type === 'HQ_WAREHOUSE' && !data.k3WarehouseCode) {
      throw new BadRequestException('总仓必须配置 K3 仓库编码');
    }
  }

  async create(data: WarehouseInput) {
    this.validateWarehouseData(data);
    const warehouseNo = await this.generateWarehouseNo();
    return this.prisma.warehouse.create({ data: { ...data, warehouseNo } });
  }

  async update(id: number, data: Partial<WarehouseInput>) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException('仓库不存在');
    this.validateWarehouseData({
      type: data.type || warehouse.type,
      outletId: data.outletId ?? warehouse.outletId,
      ownerEngineerId: data.ownerEngineerId ?? warehouse.ownerEngineerId,
      k3WarehouseCode: data.k3WarehouseCode ?? warehouse.k3WarehouseCode,
    });
    const updated = await this.prisma.warehouse.update({ where: { id }, data });
    if (data.name && data.name !== warehouse.name) {
      await this.prisma.inventoryBalance.updateMany({
        where: { warehouseId: id },
        data: { warehouseName: data.name },
      });
    }
    return updated;
  }

  async toggleStatus(id: number) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException('仓库不存在');
    return this.prisma.warehouse.update({
      where: { id },
      data: { status: warehouse.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
    });
  }

  private async generateWarehouseNo(): Promise<string> {
    const count = await this.prisma.warehouse.count();
    const next = count + 1;
    return `WH${String(next).padStart(4, '0')}`;
  }

  async findAllSimple(user?: { sub: number; role?: string }) {
    const where: any = await this.buildScopeWhere(user);
    where.status = 'ACTIVE';
    return this.prisma.warehouse.findMany({ where, orderBy: { name: 'asc' } });
  }

  async delete(id: number) {
    return this.prisma.warehouse.update({ where: { id }, data: { status: 'DISABLED' } });
  }
}

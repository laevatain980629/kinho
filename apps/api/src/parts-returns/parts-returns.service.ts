import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';

type ReturnQualityResult = 'GOOD' | 'DAMAGED' | 'OLD_PART' | 'NEED_INSPECTION';

interface AccessUser {
  sub: number;
  role?: string;
}

const GLOBAL_RETURN_ROLES = ['admin', 'hq_service', 'warehouse', 'supervisor', 'chief_engineer'];

@Injectable()
export class PartsReturnsService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  private async findOutletWarehouse(outletId: number) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { type: 'OUTLET_WAREHOUSE', outletId, status: 'ACTIVE' },
      orderBy: { id: 'asc' },
    });
    if (!warehouse) throw new BadRequestException('当前网点没有可用网点仓');
    return warehouse;
  }

  private async ensureEngineerWarehouse(engineerId: number) {
    const engineer = await this.prisma.user.findUnique({
      where: { id: engineerId },
      include: { outlet: { select: { id: true, name: true } } },
    });
    if (!engineer || engineer.role !== 'engineer') throw new BadRequestException('只有工程师可以发起退库');
    if (engineer.status !== 'ACTIVE') throw new BadRequestException('工程师账号已禁用，不能发起退库');
    if (!engineer.outletId || !engineer.outlet) throw new BadRequestException('工程师未绑定网点，不能发起退库');

    let warehouse = await this.prisma.warehouse.findFirst({
      where: { type: 'ENGINEER_WAREHOUSE', ownerEngineerId: engineer.id },
    });
    if (!warehouse) {
      warehouse = await this.prisma.warehouse.create({
        data: {
          warehouseNo: `WH-ENG-${String(engineer.id).padStart(4, '0')}`,
          name: `${engineer.name}个人仓`,
          type: 'ENGINEER_WAREHOUSE',
          ownerEngineerId: engineer.id,
          outletId: engineer.outletId,
          outletName: engineer.outlet.name,
          ownerEngineerName: engineer.name,
          ownerOutletIdSnapshot: engineer.outletId,
          status: 'ACTIVE',
        },
      });
    }

    return { engineer, warehouse };
  }

  private isGlobalRole(role?: string) {
    return GLOBAL_RETURN_ROLES.includes(role || '');
  }

  private async buildScopeWhere(userId?: number, userRole?: string) {
    if (!userId || !userRole || this.isGlobalRole(userRole)) return null;

    if (userRole === 'engineer') {
      return {
        OR: [
          { workOrder: { engineerId: userId } },
          { fromWarehouse: { ownerEngineerId: userId } },
          { toWarehouse: { ownerEngineerId: userId } },
        ],
      };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { outletId: true } });
    if (!user?.outletId) return { id: -1 };

    return {
      OR: [
        { workOrder: { outletId: user.outletId } },
        { fromWarehouse: { outletId: user.outletId } },
        { toWarehouse: { outletId: user.outletId } },
      ],
    };
  }

  private async assertScope(id: number, user?: AccessUser) {
    const scope = await this.buildScopeWhere(user?.sub, user?.role);
    if (!scope) return;
    const scoped = await this.prisma.partsReturn.findFirst({
      where: { id, AND: [scope] },
      select: { id: true },
    });
    if (!scoped) throw new NotFoundException('退库单不存在');
  }

  private async generateReturnNo(): Promise<string> {
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const prefix = `RET-${datePart}-`;

    const last = await this.prisma.partsReturn.findFirst({
      where: { returnNo: { startsWith: prefix } },
      orderBy: { returnNo: 'desc' },
    });

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.returnNo.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async findAll(params: {
    keyword?: string;
    reason?: string;
    status?: string;
    workOrderId?: number;
    page?: number;
    pageSize?: number;
    userId?: number;
    userRole?: string;
  }) {
    const { keyword, reason, status, workOrderId, page = 1, pageSize = 20, userId, userRole } = params;
    const where: Prisma.PartsReturnWhereInput = {};

    if (keyword) {
      where.OR = [
        { returnNo: { contains: keyword } },
        { reason: { contains: keyword } },
      ];
    }
    if (reason) where.reason = reason;
    if (status) where.status = status;
    if (workOrderId !== undefined) where.workOrderId = workOrderId;

    // 网点权限隔离
    const GLOBAL_ROLES = ['admin', 'hq_service', 'warehouse', 'supervisor'];
    if (userId && userRole && !GLOBAL_ROLES.includes(userRole)) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { outletId: true } });
      if (user?.outletId) {
        where.workOrder = { outletId: user.outletId };
      } else {
        where.id = -1;
      }
    }

    const scope = await this.buildScopeWhere(userId, userRole);
    delete (where as any).workOrder;
    delete (where as any).id;
    if (scope) {
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, scope];
    }

    const [list, total] = await Promise.all([
      this.prisma.partsReturn.findMany({
        include: {
          fromWarehouse: { select: { id: true, name: true } },
          toWarehouse: { select: { id: true, name: true } },
          workOrder: { select: { id: true, orderNo: true } },
          items: true,
        },
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.partsReturn.count({ where }),
    ]);

    return {
      list: list.map((r) => ({
        ...r,
        fromWarehouseName: r.fromWarehouse?.name || null,
        toWarehouseName: r.toWarehouse?.name || null,
        workOrderNo: r.workOrder?.orderNo || null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: number, user?: AccessUser) {
    const partsReturn = await this.prisma.partsReturn.findUnique({
      where: { id },
      include: { items: true, fromWarehouse: true, toWarehouse: true, workOrder: true },
    });
    if (!partsReturn) {
      throw new NotFoundException('退库单不存在');
    }
    await this.assertScope(id, user);
    return partsReturn;
  }

  async create(data: {
    workOrderId?: number;
    fromWarehouseId: number;
    toWarehouseId: number;
    reason: string;
    qualityResult?: string;
    items: Array<{
      partId: number;
      partNo?: string;
      partName?: string;
      partModel?: string;
      quantity: number;
      qualityResult?: string;
    }>;
    operatorId: number;
    operatorRole?: string;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('至少需要一个退库配件');
    }

    if (data.items.some((item) => item.quantity <= 0)) {
      throw new BadRequestException('退库数量必须大于0');
    }

    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new BadRequestException('源仓库和目标仓库不能相同');
    }

    if (data.operatorRole === 'engineer') {
      const { engineer, warehouse } = await this.ensureEngineerWarehouse(data.operatorId);
      const outletWarehouse = await this.findOutletWarehouse(engineer.outletId as number);
      if (data.fromWarehouseId !== warehouse.id) {
        throw new BadRequestException('工程师退库只能从自己的个人仓发起');
      }
      if (data.toWarehouseId !== outletWarehouse.id) {
        throw new BadRequestException('工程师退库只能退回本网点仓');
      }
      if (data.workOrderId) {
        const workOrder = await this.prisma.workOrder.findUnique({
          where: { id: data.workOrderId },
          select: { outletId: true, engineerId: true },
        });
        if (!workOrder) throw new BadRequestException('关联工单不存在');
        if (workOrder.outletId && workOrder.outletId !== engineer.outletId) throw new BadRequestException('不能为其他网点工单退库');
        if (workOrder.engineerId && workOrder.engineerId !== engineer.id) throw new BadRequestException('不能为其他工程师的工单退库');
      }
    }

    const returnNo = await this.generateReturnNo();

    return this.prisma.partsReturn.create({
      data: {
        returnNo,
        workOrderId: data.workOrderId,
        fromWarehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        reason: data.reason,
        qualityResult: data.qualityResult,
        status: 'DRAFT',
        items: {
          create: data.items.map((item) => ({
            partId: item.partId,
            partNo: item.partNo ?? '',
            partName: item.partName ?? '',
            partModel: item.partModel ?? '',
            quantity: item.quantity,
            qualityResult: item.qualityResult,
          })),
        },
      },
      include: { items: true },
    });
  }

  async confirm(
    id: number,
    operatorId: number,
    operatorName: string,
    itemQualityResults?: Array<{ partId?: number; quantity?: number; qualityResult?: string }>,
    user?: AccessUser,
  ) {
    const partsReturn = await this.findById(id, user);

    if (partsReturn.status !== 'DRAFT') {
      throw new BadRequestException(`退库单当前状态为 ${partsReturn.status}`);
    }

    if (partsReturn.items.length === 0) {
      throw new BadRequestException('退库单缺少配件明细');
    }

    const qualityByPartId = new Map(
      (itemQualityResults ?? []).map((item) => [item.partId, item.qualityResult]),
    );

    // Phase 1: validate all quality results before any mutation
    const resolved: Array<{ item: typeof partsReturn.items[0]; qualityResult: string; skip: boolean }> = [];
    for (const item of partsReturn.items) {
      const qualityResult = (qualityByPartId.get(item.partId) ??
        item.qualityResult ??
        partsReturn.qualityResult) as ReturnQualityResult | null;

      if (!qualityResult) {
        throw new BadRequestException(`配件 ${item.partName || item.partId} 缺少质检结果`);
      }

      resolved.push({
        item,
        qualityResult,
        skip: qualityResult === 'NEED_INSPECTION',
      });
    }

    // Phase 2 + 3: execute transfers and update status in one transaction
    return this.prisma.$transaction(async (tx) => {
      for (const r of resolved) {
        if (r.skip) continue;

        await this.inventoryService.transfer(
          partsReturn.fromWarehouseId,
          partsReturn.toWarehouseId,
          r.item.partId,
          r.item.quantity,
          operatorId,
          operatorName,
          tx,
        );
      }

      for (const r of resolved) {
        if (qualityByPartId.has(r.item.partId)) {
          await tx.partsReturnItem.update({
            where: { id: r.item.id },
            data: { qualityResult: r.qualityResult },
          });
        }
      }

      return tx.partsReturn.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
        include: { items: true },
      });
    });
  }

  async reject(id: number, rejectReason: string, user?: AccessUser) {
    const partsReturn = await this.findById(id, user);

    if (partsReturn.status !== 'DRAFT') {
      throw new BadRequestException(`退库单当前状态为 ${partsReturn.status}`);
    }

    return this.prisma.partsReturn.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectReason,
      },
      include: { items: true },
    });
  }
}

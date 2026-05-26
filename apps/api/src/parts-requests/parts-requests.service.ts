import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';

interface PartsRequestItemInput {
  partId: number;
  partNo: string;
  partName: string;
  partModel: string;
  quantity: number;
}

interface AccessUser {
  sub: number;
  role?: string;
  username?: string;
}

const GLOBAL_PARTS_ROLES = ['admin', 'hq_service', 'warehouse', 'supervisor', 'chief_engineer'];

@Injectable()
export class PartsRequestsService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private workOrdersService: WorkOrdersService,
  ) {}

  private async generateRequestNo(): Promise<string> {
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const prefix = `PR-${datePart}-`;

    const last = await this.prisma.partsRequest.findFirst({
      where: { requestNo: { startsWith: prefix } },
      orderBy: { requestNo: 'desc' },
    });

    const lastSeq = last ? parseInt(last.requestNo.slice(prefix.length), 10) : 0;
    const seq = Number.isNaN(lastSeq) ? 1 : lastSeq + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

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
    if (!engineer || engineer.role !== 'engineer') throw new BadRequestException('只有工程师可以领料到个人仓');
    if (engineer.status !== 'ACTIVE') throw new BadRequestException('工程师账号已禁用，不能领料');
    if (!engineer.outletId || !engineer.outlet) throw new BadRequestException('工程师未绑定网点，不能领料');

    const data = {
      name: `${engineer.name}个人仓`,
      outletId: engineer.outletId,
      outletName: engineer.outlet.name,
      ownerEngineerName: engineer.name,
      ownerOutletIdSnapshot: engineer.outletId,
      status: 'ACTIVE',
    };

    let warehouse = await this.prisma.warehouse.findFirst({
      where: { type: 'ENGINEER_WAREHOUSE', ownerEngineerId: engineer.id },
    });

    if (warehouse) {
      warehouse = await this.prisma.warehouse.update({ where: { id: warehouse.id }, data });
    } else {
      warehouse = await this.prisma.warehouse.create({
        data: {
          warehouseNo: `WH-ENG-${String(engineer.id).padStart(4, '0')}`,
          type: 'ENGINEER_WAREHOUSE',
          ownerEngineerId: engineer.id,
          ...data,
        },
      });
    }

    return { engineer, warehouse };
  }

  private isGlobalRole(role?: string) {
    return GLOBAL_PARTS_ROLES.includes(role || '');
  }

  private appendScope(where: any, scope: Prisma.PartsRequestWhereInput) {
    const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [...existingAnd, scope];
  }

  private async buildScopeWhere(userId?: number, userRole?: string): Promise<Prisma.PartsRequestWhereInput | null> {
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
    const scoped = await this.prisma.partsRequest.findFirst({
      where: { id, AND: [scope] },
      select: { id: true },
    });
    if (!scoped) throw new NotFoundException('配件申请不存在');
  }

  private async resolveRequestWarehouses(data: {
    fromWarehouseId?: number;
    toWarehouseId?: number;
    workOrderId?: number;
    operatorId: number;
    operatorRole?: string;
  }) {
    if (data.operatorRole === 'engineer') {
      const { engineer, warehouse: personalWarehouse } = await this.ensureEngineerWarehouse(data.operatorId);
      const outletWarehouse = await this.findOutletWarehouse(engineer.outletId as number);

      if (data.fromWarehouseId !== undefined && data.fromWarehouseId !== outletWarehouse.id) {
        const fromWh = await this.prisma.warehouse.findUnique({ where: { id: data.fromWarehouseId } });
        if (!fromWh || fromWh.type !== 'HQ_WAREHOUSE') {
          throw new BadRequestException('工程师只能从所属网点仓或总仓发起领料');
        }
      }
      if (data.toWarehouseId !== undefined && data.toWarehouseId !== personalWarehouse.id) {
        throw new BadRequestException('工程师领料只能进入本人个人仓');
      }

      if (data.workOrderId) {
        const workOrder = await this.prisma.workOrder.findUnique({
          where: { id: data.workOrderId },
          select: { outletId: true, engineerId: true },
        });
        if (!workOrder) throw new BadRequestException('关联工单不存在');
        if (workOrder.outletId && workOrder.outletId !== engineer.outletId) throw new BadRequestException('不能为其他网点工单领料');
        if (workOrder.engineerId && workOrder.engineerId !== engineer.id) throw new BadRequestException('不能为其他工程师的工单领料');
      }

      return { fromWarehouseId: data.fromWarehouseId || outletWarehouse.id, toWarehouseId: personalWarehouse.id };
    }

    if (!data.fromWarehouseId || !data.toWarehouseId) throw new BadRequestException('请选择源仓库和目标仓库');

    const [fromWh, toWh] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: data.fromWarehouseId } }),
      this.prisma.warehouse.findUnique({ where: { id: data.toWarehouseId } }),
    ]);
    if (!fromWh || !toWh) throw new BadRequestException('仓库不存在');
    if (fromWh.type === 'ENGINEER_WAREHOUSE') throw new BadRequestException('工程师个人仓不能作为领料出库仓库');
    if (toWh.type === 'ENGINEER_WAREHOUSE') {
      if (fromWh.type !== 'OUTLET_WAREHOUSE') throw new BadRequestException('领料到个人仓必须从所属网点仓出库');
      if (!toWh.outletId || fromWh.outletId !== toWh.outletId) throw new BadRequestException('源网点仓和目标个人仓必须属于同一网点');
    }

    if (data.workOrderId) {
      const workOrder = await this.prisma.workOrder.findUnique({
        where: { id: data.workOrderId },
        select: { outletId: true, engineerId: true },
      });
      if (!workOrder) throw new BadRequestException('关联工单不存在');
      if (workOrder.outletId) {
        if (fromWh.outletId && fromWh.outletId !== workOrder.outletId) throw new BadRequestException('出库仓库必须属于工单所属网点');
        if (toWh.outletId && toWh.outletId !== workOrder.outletId) throw new BadRequestException('目标仓库必须属于工单所属网点');
      }
      if (toWh.type === 'ENGINEER_WAREHOUSE' && workOrder.engineerId && toWh.ownerEngineerId !== workOrder.engineerId) {
        throw new BadRequestException('目标个人仓必须属于工单当前工程师');
      }
    }

    return { fromWarehouseId: data.fromWarehouseId, toWarehouseId: data.toWarehouseId };
  }

  async findAll(params: {
    keyword?: string;
    type?: string;
    status?: string;
    workOrderId?: number;
    page?: number;
    pageSize?: number;
    userId?: number;
    userRole?: string;
  }) {
    const { keyword, type, status, workOrderId, page = 1, pageSize = 20, userId, userRole } = params;
    const where: Prisma.PartsRequestWhereInput = {};

    if (keyword) where.OR = [{ requestNo: { contains: keyword } }];
    if (type) where.type = type;
    if (status) where.status = status;
    if (workOrderId !== undefined) where.workOrderId = workOrderId;

    // 网点权限隔离：非全局角色只能看自己网点
    const GLOBAL_ROLES = ['admin', 'hq_service', 'warehouse', 'supervisor'];
    if (userId && userRole && !GLOBAL_ROLES.includes(userRole)) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { outletId: true } });
      if (user?.outletId) {
        where.workOrder = { outletId: user.outletId };
      } else {
        // 无网点归属的角色（如总工）看不到任何领料单
        where.id = -1;
      }
    }

    const scope = await this.buildScopeWhere(userId, userRole);
    delete (where as any).workOrder;
    delete (where as any).id;
    if (scope) this.appendScope(where, scope);

    const [list, total] = await Promise.all([
      this.prisma.partsRequest.findMany({
        where,
        include: {
          fromWarehouse: { select: { id: true, name: true } },
          toWarehouse: { select: { id: true, name: true } },
          workOrder: { select: { id: true, orderNo: true } },
          items: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.partsRequest.count({ where }),
    ]);

    return {
      list: (list as any[]).map((r) => ({
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
    const partsRequest = await this.prisma.partsRequest.findUnique({
      where: { id },
      include: { items: true, fromWarehouse: true, toWarehouse: true, workOrder: true },
    });
    if (!partsRequest) throw new NotFoundException('配件申请不存在');
    await this.assertScope(id, user);
    return partsRequest;
  }

  async create(data: {
    type: string;
    fromWarehouseId?: number;
    toWarehouseId?: number;
    workOrderId?: number;
    items: PartsRequestItemInput[];
    operatorId: number;
    operatorName: string;
    operatorRole?: string;
  }) {
    if (!data.items || data.items.length === 0) throw new BadRequestException('至少需要一个配件项');

    const warehouses = await this.resolveRequestWarehouses(data);
    if (warehouses.fromWarehouseId === warehouses.toWarehouseId) throw new BadRequestException('源仓库和目标仓库不能相同');

    for (const item of data.items) {
      const balance = await this.prisma.inventoryBalance.findFirst({
        where: { warehouseId: warehouses.fromWarehouseId, partId: item.partId },
      });
      const available = balance?.quantityAvailable ?? 0;
      if (available < item.quantity) {
        throw new BadRequestException(`源仓库存不足: ${item.partName} 需要 ${item.quantity}，可用 ${available}`);
      }
    }

    const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
    const requestNo = await this.generateRequestNo();

    if (data.workOrderId) {
      await this.workOrdersService.hold(data.workOrderId, `等待配件申请 ${requestNo}`, data.operatorId, data.operatorName, data.operatorRole);
    }

    return this.prisma.partsRequest.create({
      data: {
        requestNo,
        type: data.type,
        workOrderId: data.workOrderId,
        fromWarehouseId: warehouses.fromWarehouseId,
        toWarehouseId: warehouses.toWarehouseId,
        status: 'PENDING',
        totalQuantity,
        items: {
          create: data.items.map((item) => ({
            partId: item.partId,
            partNo: item.partNo,
            partName: item.partName,
            partModel: item.partModel,
            quantity: item.quantity,
            reservedQuantity: 0,
            shippedQuantity: 0,
            receivedQuantity: 0,
          })),
        },
      },
      include: { items: true },
    });
  }

  async approve(id: number, operatorId: number, operatorName: string, user?: AccessUser) {
    const partsRequest = await this.findById(id, user);
    if (partsRequest.status !== 'PENDING') throw new BadRequestException(`无法审批: 当前状态为 ${partsRequest.status}`);

    return this.prisma.$transaction(async (tx) => {
      for (const item of partsRequest.items) {
        await this.inventoryService.reserve(
          partsRequest.fromWarehouseId,
          item.partId,
          item.quantity,
          'PARTS_REQUEST',
          partsRequest.id,
          operatorId,
          operatorName,
          tx,
        );
        await tx.partsRequestItem.update({
          where: { id: item.id },
          data: { reservedQuantity: item.quantity },
        });
      }

      return tx.partsRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
        include: { items: true },
      });
    });
  }

  async reject(id: number, reason: string, user?: AccessUser) {
    const partsRequest = await this.findById(id, user);
    if (partsRequest.status !== 'PENDING') throw new BadRequestException(`无法拒绝: 当前状态为 ${partsRequest.status}`);

    return this.prisma.partsRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: reason },
      include: { items: true },
    });
  }

  async ship(id: number, user?: AccessUser) {
    const partsRequest = await this.findById(id, user);
    if (partsRequest.status !== 'APPROVED') throw new BadRequestException(`无法发货: 当前状态为 ${partsRequest.status}`);

    return this.prisma.$transaction(async (tx) => {
      for (const item of partsRequest.items) {
        await this.inventoryService.shipReserved(
          partsRequest.fromWarehouseId,
          item.partId,
          item.quantity,
          'PARTS_REQUEST',
          partsRequest.id,
          user?.sub || 0,
          user?.username || 'warehouse',
          tx,
        );
        await tx.partsRequestItem.update({
          where: { id: item.id },
          data: {
            reservedQuantity: 0,
            shippedQuantity: item.quantity,
          },
        });
      }

      return tx.partsRequest.update({
        where: { id },
        data: { status: 'SHIPPED' },
        include: { items: true },
      });
    });
  }

  async receive(id: number, operatorId: number, operatorName: string, user?: AccessUser) {
    const partsRequest = await this.findById(id, user);
    if (partsRequest.status !== 'SHIPPED') throw new BadRequestException(`无法收货: 当前状态为 ${partsRequest.status}`);

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of partsRequest.items) {
        let shippedQuantity = item.shippedQuantity;
        if (shippedQuantity === 0 && item.receivedQuantity === 0) {
          await this.inventoryService.shipReserved(
            partsRequest.fromWarehouseId,
            item.partId,
            item.quantity,
            'PARTS_REQUEST',
            partsRequest.id,
            operatorId,
            operatorName,
            tx,
          );
          shippedQuantity = item.quantity;
        }

        const inTransitQuantity = shippedQuantity - item.receivedQuantity;
        if (inTransitQuantity <= 0) {
          throw new BadRequestException(`${item.partName} 没有待收货数量`);
        }
        await this.inventoryService.receive(
          partsRequest.toWarehouseId,
          item.partId,
          inTransitQuantity,
          'GOOD',
          'PARTS_REQUEST',
          partsRequest.id,
          operatorId,
          operatorName,
          tx,
        );
        await tx.partsRequestItem.update({
          where: { id: item.id },
          data: {
            shippedQuantity,
            reservedQuantity: 0,
            receivedQuantity: item.receivedQuantity + inTransitQuantity,
          },
        });
      }

      return tx.partsRequest.update({
        where: { id },
        data: { status: 'RECEIVED' },
        include: { items: true },
      });
    });

    if (partsRequest.workOrderId) {
      const workOrder = await this.workOrdersService.findById(partsRequest.workOrderId);
      if (workOrder.holdStatus === 'HELD' && workOrder.holdReason?.includes(partsRequest.requestNo)) {
        await this.workOrdersService.unhold(partsRequest.workOrderId, operatorId, operatorName);
      }
    }

    return updated;
  }

  async cancel(id: number, operatorId: number, operatorName: string, user?: AccessUser) {
    const partsRequest = await this.findById(id, user);
    if (partsRequest.status !== 'APPROVED') throw new BadRequestException(`无法取消: 当前状态为 ${partsRequest.status}`);

    return this.prisma.$transaction(async (tx) => {
      for (const item of partsRequest.items) {
        const reservedQuantity = item.reservedQuantity || item.quantity;
        await this.inventoryService.release(
          partsRequest.fromWarehouseId,
          item.partId,
          reservedQuantity,
          operatorId,
          operatorName,
          tx,
        );
        await tx.partsRequestItem.update({
          where: { id: item.id },
          data: { reservedQuantity: 0 },
        });
      }

      return tx.partsRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { items: true },
      });
    });
  }

  async resubmit(id: number, data: {
    fromWarehouseId: number;
    toWarehouseId: number;
    items: PartsRequestItemInput[];
  }, user?: AccessUser) {
    const partsRequest = await this.findById(id, user);
    if (partsRequest.status !== 'REJECTED') throw new BadRequestException(`无法重新提交: 当前状态为 ${partsRequest.status}`);
    if (!data.items || data.items.length === 0) throw new BadRequestException('至少需要一个配件项');

    const warehouses = await this.resolveRequestWarehouses({
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      workOrderId: partsRequest.workOrderId || undefined,
      operatorId: user?.sub || 0,
      operatorRole: user?.role,
    });

    for (const item of data.items) {
      const balance = await this.prisma.inventoryBalance.findFirst({
        where: { warehouseId: warehouses.fromWarehouseId, partId: item.partId },
      });
      const available = balance?.quantityAvailable ?? 0;
      if (available < item.quantity) {
        throw new BadRequestException(`源仓库存不足: ${item.partName} 需要 ${item.quantity}，可用 ${available}`);
      }
    }

    const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
    await this.prisma.partsRequestItem.deleteMany({ where: { partsRequestId: id } });

    return this.prisma.partsRequest.update({
      where: { id },
      data: {
        fromWarehouseId: warehouses.fromWarehouseId,
        toWarehouseId: warehouses.toWarehouseId,
        totalQuantity,
        status: 'PENDING',
        rejectReason: null,
        items: {
          create: data.items.map((item) => ({
            partId: item.partId,
            partNo: item.partNo,
            partName: item.partName,
            partModel: item.partModel,
            quantity: item.quantity,
            reservedQuantity: 0,
            shippedQuantity: 0,
            receivedQuantity: 0,
          })),
        },
      },
      include: { items: true },
    });
  }
}

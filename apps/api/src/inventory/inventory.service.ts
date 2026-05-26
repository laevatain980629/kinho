import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate next transaction number: INV-YYYYMMDD-XXXX
   *
   * NOTE: Race condition — two concurrent requests could read the same "last"
   * record and produce the same sequence number. In production, use a database
   * sequence (e.g. PostgreSQL SERIAL/SEQUENCE) or a UUID to guarantee uniqueness.
   */
  private async generateTransactionNo(client: any = this.prisma): Promise<string> {
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const prefix = `INV-${datePart}-`;

    const last = await client.inventoryTransaction.findFirst({
      where: { transactionNo: { startsWith: prefix } },
      orderBy: { transactionNo: 'desc' },
    });

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.transactionNo.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  /**
   * Look up warehouse name by ID.
   */
  private async getWarehouseName(warehouseId: number, client: any = this.prisma): Promise<string> {
    const warehouse = await client.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException('仓库不存在');
    }
    return warehouse.name;
  }

  /**
   * Find or create an InventoryBalance for a given warehouse+part pair.
   */
  private async getOrCreateBalance(tx: any, warehouseId: number, partId: number) {
    let balance = await tx.inventoryBalance.findFirst({ where: { warehouseId, partId } });
    if (!balance) {
      const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId }, select: { name: true } });
      const part = await tx.inventoryItem.findUnique({ where: { id: partId }, select: { partNo: true, name: true, spec: true } });
      balance = await tx.inventoryBalance.create({
        data: {
          warehouseId,
          warehouseName: warehouse?.name || '未知仓',
          partId,
          partNo: part?.partNo || '',
          partName: part?.name || '',
          partModel: part?.spec || '',
        },
      });
    }
    return balance;
  }

  // ─── Queries ──────────────────────────────────────────────

  private async getScopedWarehouseIds(user?: { sub: number; role?: string }) {
    if (!user || ['admin', 'warehouse', 'hq_service', 'supervisor', 'chief_engineer', 'procurement'].includes(user.role || '')) {
      return null;
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { outletId: true },
    });

    if (user.role === 'engineer') {
      const warehouses = await this.prisma.warehouse.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { type: 'ENGINEER_WAREHOUSE', ownerEngineerId: user.sub },
            ...(currentUser?.outletId ? [{ type: 'OUTLET_WAREHOUSE', outletId: currentUser.outletId }] : []),
          ],
        },
        select: { id: true },
      });
      return warehouses.map((w) => w.id);
    }

    if (user.role === 'outlet_manager' && currentUser?.outletId) {
      const warehouses = await this.prisma.warehouse.findMany({
        where: { status: 'ACTIVE', outletId: currentUser.outletId },
        select: { id: true },
      });
      return warehouses.map((w) => w.id);
    }

    return [];
  }

  async getBalances(warehouseId?: number, partId?: number, outletId?: number, user?: { sub: number; role?: string }) {
    const where: any = {};
    if (warehouseId !== undefined) where.warehouseId = warehouseId;
    if (partId !== undefined) where.partId = partId;

    // 按网点过滤：找到该网点下所有仓库（HQ/OUTLET/ENGINEER），然后查这些仓库的库存
    if (outletId !== undefined) {
      const outletWarehouses = await this.prisma.warehouse.findMany({
        where: { outletId, status: 'ACTIVE' },
        select: { id: true },
      });
      where.warehouseId = { in: outletWarehouses.map((w) => w.id) };
    }

    const scopedWarehouseIds = await this.getScopedWarehouseIds(user);
    if (scopedWarehouseIds) {
      const requestedIds = where.warehouseId?.in || (where.warehouseId !== undefined ? [where.warehouseId] : scopedWarehouseIds);
      where.warehouseId = { in: requestedIds.filter((id: number) => scopedWarehouseIds.includes(id)) };
    }

    return this.prisma.inventoryBalance.findMany({ where });
  }

  async getMyBalances(operatorId: number, operatorRole?: string) {
    if (operatorRole === 'engineer') {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { type: 'ENGINEER_WAREHOUSE', ownerEngineerId: operatorId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!warehouse) return [];
      return this.getBalances(warehouse.id);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: operatorId },
      select: { outletId: true },
    });
    if (operatorRole === 'outlet_manager' && user?.outletId) {
      return this.getBalances(undefined, undefined, user.outletId);
    }

    return this.getBalances();
  }

  async getTransactions(
    warehouseId?: number,
    partId?: number,
    type?: string,
    page = 1,
    pageSize = 100,
    user?: { sub: number; role?: string },
  ) {
    const where: any = {};
    if (partId !== undefined) where.partId = partId;
    if (type) where.type = type;

    const scopedWarehouseIds = await this.getScopedWarehouseIds(user);
    if (scopedWarehouseIds && scopedWarehouseIds.length === 0) {
      return { list: [], total: 0, page, pageSize };
    }

    if (scopedWarehouseIds) {
      if (warehouseId !== undefined && !scopedWarehouseIds.includes(warehouseId)) {
        return { list: [], total: 0, page, pageSize };
      }
      const allowedIds = warehouseId !== undefined ? [warehouseId] : scopedWarehouseIds;
      where.OR = [
        { fromWarehouseId: { in: allowedIds } },
        { toWarehouseId: { in: allowedIds } },
      ];
    } else if (warehouseId !== undefined) {
      where.OR = [
        { fromWarehouseId: warehouseId },
        { toWarehouseId: warehouseId },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  private async validateTransferRoute(fromWarehouseId: number, toWarehouseId: number) {
    const [fromWh, toWh] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: fromWarehouseId } }),
      this.prisma.warehouse.findUnique({ where: { id: toWarehouseId } }),
    ]);
    if (!fromWh || !toWh) throw new BadRequestException('仓库不存在');
    if (fromWh.status !== 'ACTIVE' || toWh.status !== 'ACTIVE') throw new BadRequestException('仓库已停用，不能调拨');

    if (fromWh.type === 'HQ_WAREHOUSE' && toWh.type === 'OUTLET_WAREHOUSE') return;
    if (fromWh.type === 'HQ_WAREHOUSE' && toWh.type === 'ENGINEER_WAREHOUSE') return;
    if (fromWh.type === 'OUTLET_WAREHOUSE' && toWh.type === 'ENGINEER_WAREHOUSE' && fromWh.outletId && fromWh.outletId === toWh.outletId) return;
    if (fromWh.type === 'ENGINEER_WAREHOUSE' && toWh.type === 'OUTLET_WAREHOUSE' && fromWh.outletId && fromWh.outletId === toWh.outletId) return;

    throw new BadRequestException('不允许的调拨路径：仅支持总仓到网点仓、总仓到个人仓、网点仓与本网点个人仓之间双向调拨');
  }

  // ─── Transaction Engine ───────────────────────────────────

  /**
   * Reserve inventory: decrease quantityAvailable, increase quantityReserved.
   */
  async reserve(
    warehouseId: number,
    partId: number,
    quantity: number,
    sourceType: string,
    sourceId: number,
    operatorId: number,
    operatorName: string,
    tx?: any,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('数量必须大于0');
    }

    const run = async (db: any) => {
      const transactionNo = await this.generateTransactionNo(db);
      const warehouseName = await this.getWarehouseName(warehouseId, db);
      const balance = await this.getOrCreateBalance(db, warehouseId, partId);

      if (balance.quantityAvailable < quantity) {
        throw new BadRequestException(
          `可用库存不足: 现有 ${balance.quantityAvailable}, 需要 ${quantity}`,
        );
      }

      const updated = await db.inventoryBalance.update({
        where: { id: balance.id, version: balance.version },
        data: {
          quantityAvailable: { decrement: quantity },
          quantityReserved: { increment: quantity },
          version: { increment: 1 },
        },
      });

      await db.inventoryTransaction.create({
        data: {
          transactionNo, type: 'RESERVE', direction: 'OUT',
          toWarehouseId: warehouseId, toWarehouseName: warehouseName,
          partId, partName: balance.partName, quantity,
          beforeQuantity: balance.quantityAvailable, afterQuantity: updated.quantityAvailable,
          relatedOrderType: sourceType, relatedOrderId: sourceId,
          operatorId, operatorName,
        },
      });

      return updated;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Release reserved inventory: decrease quantityReserved, increase quantityAvailable.
   */
  async release(
    warehouseId: number,
    partId: number,
    quantity: number,
    operatorId: number,
    operatorName: string,
    tx?: any,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('数量必须大于0');
    }

    const run = async (db: any) => {
      const transactionNo = await this.generateTransactionNo(db);
      const warehouseName = await this.getWarehouseName(warehouseId, db);
      const balance = await db.inventoryBalance.findFirst({
        where: { warehouseId, partId },
      });
      if (!balance) {
        throw new NotFoundException('仓库库存记录不存在');
      }

      if (balance.quantityReserved < quantity) {
        throw new BadRequestException(
          `预留库存不足: 现有 ${balance.quantityReserved}, 需要 ${quantity}`,
        );
      }

      const updated = await db.inventoryBalance.update({
        where: { id: balance.id, version: balance.version },
        data: {
          quantityReserved: { decrement: quantity },
          quantityAvailable: { increment: quantity },
          version: { increment: 1 },
        },
      });

      await db.inventoryTransaction.create({
        data: {
          transactionNo, type: 'RELEASE', direction: 'IN',
          toWarehouseId: warehouseId, toWarehouseName: warehouseName,
          partId, partName: balance.partName, quantity,
          beforeQuantity: balance.quantityReserved, afterQuantity: updated.quantityReserved,
          operatorId, operatorName,
        },
      });

      return updated;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Consume inventory: decrease quantityOnHand and quantityReserved.
   */
  async consume(
    warehouseId: number,
    partId: number,
    quantity: number,
    relatedOrderType: string,
    relatedOrderId: number,
    operatorId: number,
    operatorName: string,
    tx?: any,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('数量必须大于0');
    }

    const run = async (db: any) => {
      const transactionNo = await this.generateTransactionNo(db);
      const warehouseName = await this.getWarehouseName(warehouseId, db);
      const balance = await db.inventoryBalance.findFirst({
        where: { warehouseId, partId },
      });
      if (!balance) {
        throw new NotFoundException('仓库库存记录不存在');
      }

      if (balance.quantityOnHand < quantity) {
        throw new BadRequestException(
          `实物库存不足: 现有 ${balance.quantityOnHand}, 需要 ${quantity}`,
        );
      }

      if (balance.quantityReserved < quantity) {
        throw new BadRequestException(
          `预留库存不足: 现有 ${balance.quantityReserved}, 需要 ${quantity}`,
        );
      }

      const updated = await db.inventoryBalance.update({
        where: { id: balance.id, version: balance.version },
        data: {
          quantityOnHand: { decrement: quantity },
          quantityReserved: { decrement: quantity },
          version: { increment: 1 },
        },
      });

      await db.inventoryTransaction.create({
        data: {
          transactionNo, type: 'CONSUME', direction: 'OUT',
          fromWarehouseId: warehouseId, fromWarehouseName: warehouseName,
          partId, partName: balance.partName, quantity,
          beforeQuantity: balance.quantityOnHand, afterQuantity: updated.quantityOnHand,
          relatedOrderType, relatedOrderId, operatorId, operatorName,
        },
      });

      return updated;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Ship reserved inventory out of the source warehouse.
   * The quantity was already removed from available stock when reserved.
   */
  async shipReserved(
    warehouseId: number,
    partId: number,
    quantity: number,
    relatedOrderType: string,
    relatedOrderId: number,
    operatorId: number,
    operatorName: string,
    tx?: any,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('数量必须大于0');
    }

    const run = async (db: any) => {
      const transactionNo = await this.generateTransactionNo(db);
      const warehouseName = await this.getWarehouseName(warehouseId, db);
      const balance = await db.inventoryBalance.findFirst({
        where: { warehouseId, partId },
      });
      if (!balance) {
        throw new NotFoundException('仓库库存记录不存在');
      }

      if (balance.quantityOnHand < quantity) {
        throw new BadRequestException(
          `实物库存不足: 现有 ${balance.quantityOnHand}, 需要 ${quantity}`,
        );
      }

      if (balance.quantityReserved < quantity) {
        throw new BadRequestException(
          `预留库存不足: 现有 ${balance.quantityReserved}, 需要 ${quantity}`,
        );
      }

      const updated = await db.inventoryBalance.update({
        where: { id: balance.id, version: balance.version },
        data: {
          quantityOnHand: { decrement: quantity },
          quantityReserved: { decrement: quantity },
          version: { increment: 1 },
        },
      });

      await db.inventoryTransaction.create({
        data: {
          transactionNo, type: 'SHIP', direction: 'OUT',
          fromWarehouseId: warehouseId, fromWarehouseName: warehouseName,
          partId, partName: balance.partName, quantity,
          beforeQuantity: balance.quantityOnHand, afterQuantity: updated.quantityOnHand,
          relatedOrderType, relatedOrderId, operatorId, operatorName,
        },
      });

      return updated;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Receive returned parts into a warehouse.
   * Increases either quantityAvailable or quantityDamaged based on qualityResult.
   */
  async receive(
    warehouseId: number,
    partId: number,
    quantity: number,
    qualityResult: 'GOOD' | 'DAMAGED' | 'OLD_PART' | 'NEED_INSPECTION',
    sourceType: string,
    sourceId: number,
    operatorId: number,
    operatorName: string,
    tx?: any,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('数量必须大于0');
    }

    const isDamaged = qualityResult === 'DAMAGED' || qualityResult === 'OLD_PART';
    const run = async (db: any) => {
      const transactionNo = await this.generateTransactionNo(db);
      const warehouseName = await this.getWarehouseName(warehouseId, db);
      const balance = await this.getOrCreateBalance(db, warehouseId, partId);

      const updateData: any = { version: { increment: 1 } };

      if (isDamaged) {
        updateData.quantityDamaged = { increment: quantity };
      } else {
        updateData.quantityOnHand = { increment: quantity };
        updateData.quantityAvailable = { increment: quantity };
      }

      const updated = await db.inventoryBalance.update({
        where: { id: balance.id, version: balance.version },
        data: updateData,
      });

      await db.inventoryTransaction.create({
        data: {
          transactionNo, type: 'RECEIVE', direction: 'IN',
          toWarehouseId: warehouseId, toWarehouseName: warehouseName,
          partId, partName: balance.partName, quantity,
          beforeQuantity: balance.quantityOnHand, afterQuantity: updated.quantityOnHand,
          relatedOrderType: sourceType, relatedOrderId: sourceId,
          operatorId, operatorName, remark: `Quality: ${qualityResult}`,
        },
      });

      return updated;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Transfer inventory between warehouses.
   * Creates two transactions (TRANSFER_OUT + TRANSFER_IN) and updates both balances.
   */
  async transfer(
    fromWarehouseId: number,
    toWarehouseId: number,
    partId: number,
    quantity: number,
    operatorId: number,
    operatorName: string,
    tx?: any,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('数量必须大于0');
    }
    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('不能调拨到同一仓库');
    }

    // 事务外获取仓库名和流水号，避免 SQLite 锁冲突
    // 连续生成两个流水号时，第二个必须在第一个基础上手动递增
    // 因为第一个还未入库，findFirst 会返回同样的结果
    await this.validateTransferRoute(fromWarehouseId, toWarehouseId);
    const run = async (db: any) => {
      const fromWarehouseName = await this.getWarehouseName(fromWarehouseId, db);
      const toWarehouseName = await this.getWarehouseName(toWarehouseId, db);
      const outTxNo = await this.generateTransactionNo(db);
      const lastSeq = parseInt(outTxNo.slice(-4), 10);
      const inTxNo = outTxNo.slice(0, -4) + (lastSeq + 1).toString().padStart(4, '0');

      const fromBalance = await db.inventoryBalance.findFirst({
        where: { warehouseId: fromWarehouseId, partId },
      });
      if (!fromBalance) {
        throw new NotFoundException('源仓库库存记录不存在');
      }

      if (fromBalance.quantityAvailable < quantity) {
        throw new BadRequestException(
          `源仓库可用库存不足: 现有 ${fromBalance.quantityAvailable}, 需要 ${quantity}`,
        );
      }

      const updatedFrom = await db.inventoryBalance.update({
        where: { id: fromBalance.id, version: fromBalance.version },
        data: {
          quantityOnHand: { decrement: quantity },
          quantityAvailable: { decrement: quantity },
          version: { increment: 1 },
        },
      });

      let toBalance = await db.inventoryBalance.findFirst({
        where: { warehouseId: toWarehouseId, partId },
      });

      if (!toBalance) {
        toBalance = await db.inventoryBalance.create({
          data: {
            warehouseId: toWarehouseId,
            warehouseName: toWarehouseName,
            partId,
            partNo: fromBalance.partNo,
            partName: fromBalance.partName,
            partModel: fromBalance.partModel,
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityAvailable: 0,
            quantityDamaged: 0,
          },
        });
      }

      const updatedTo = await db.inventoryBalance.update({
        where: { id: toBalance.id, version: toBalance.version },
        data: {
          quantityOnHand: { increment: quantity },
          quantityAvailable: { increment: quantity },
          version: { increment: 1 },
        },
      });

      await db.inventoryTransaction.create({
        data: {
          transactionNo: outTxNo, type: 'TRANSFER', direction: 'OUT',
          fromWarehouseId, fromWarehouseName, toWarehouseId, toWarehouseName,
          partId, partName: fromBalance.partName, quantity,
          beforeQuantity: fromBalance.quantityOnHand, afterQuantity: updatedFrom.quantityOnHand,
          operatorId, operatorName,
        },
      });

      await db.inventoryTransaction.create({
        data: {
          transactionNo: inTxNo, type: 'TRANSFER', direction: 'IN',
          fromWarehouseId, fromWarehouseName, toWarehouseId, toWarehouseName,
          partId, partName: fromBalance.partName, quantity,
          beforeQuantity: toBalance.quantityOnHand, afterQuantity: updatedTo.quantityOnHand,
          operatorId, operatorName,
        },
      });

      return { from: updatedFrom, to: updatedTo };
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  async syncK3Stock(
    warehouseId: number,
    items: Array<{ partId: number; quantity: number }>,
    operatorId: number,
    operatorName: string,
  ) {
    if (!items.length) throw new BadRequestException('同步明细不能为空');
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new BadRequestException('仓库不存在');
    if (warehouse.type !== 'HQ_WAREHOUSE') throw new BadRequestException('K3库存只能同步到总仓');
    if (warehouse.status !== 'ACTIVE') throw new BadRequestException('总仓已停用，不能同步');

    const baseTxNo = await this.generateTransactionNo();
    const baseSeq = parseInt(baseTxNo.slice(-4), 10);
    const prefix = baseTxNo.slice(0, -4);

    return this.prisma.$transaction(async (tx) => {
      const result: any[] = [];

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item.quantity < 0) throw new BadRequestException('同步库存不能为负数');

        const part = await tx.inventoryItem.findUnique({ where: { id: item.partId } });
        if (!part) throw new BadRequestException(`配件不存在: ${item.partId}`);

        const balance = await tx.inventoryBalance.upsert({
          where: { warehouseId_partId: { warehouseId, partId: item.partId } },
          create: {
            warehouseId,
            warehouseName: warehouse.name,
            partId: item.partId,
            partNo: part.partNo,
            partName: part.name,
            partModel: part.spec || '',
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityAvailable: 0,
            quantityDamaged: 0,
          },
          update: {
            warehouseName: warehouse.name,
            partNo: part.partNo,
            partName: part.name,
            partModel: part.spec || '',
          },
        });

        if (item.quantity < balance.quantityReserved) {
          throw new BadRequestException(`${part.name} 同步数量小于已预留数量 ${balance.quantityReserved}`);
        }

        const updated = await tx.inventoryBalance.update({
          where: { id: balance.id, version: balance.version },
          data: {
            quantityOnHand: item.quantity,
            quantityAvailable: item.quantity - balance.quantityReserved,
            version: { increment: 1 },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            transactionNo: prefix + (baseSeq + index).toString().padStart(4, '0'),
            type: 'K3_SYNC',
            direction: 'IN',
            toWarehouseId: warehouseId,
            toWarehouseName: warehouse.name,
            partId: item.partId,
            partName: part.name,
            quantity: item.quantity,
            beforeQuantity: balance.quantityOnHand,
            afterQuantity: updated.quantityOnHand,
            relatedOrderType: 'K3_SYNC',
            operatorId,
            operatorName,
          },
        });

        result.push(updated);
      }

      await tx.k3SyncRecord.create({
        data: {
          syncNo: `K3-${Date.now()}`,
          syncType: 'INVENTORY',
          status: 'SUCCESS',
          totalCount: items.length,
          successCount: items.length,
          failedCount: 0,
          finishedAt: new Date(),
        },
      });

      return result;
    });
  }

  async adjust(warehouseId: number, partId: number, quantity: number, reason: string, operatorId: number, operatorName: string) {
    const txnNo = await this.generateTransactionNo();

    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.warehouse.findUniqueOrThrow({ where: { id: warehouseId } });
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: partId } });
      const balance = await tx.inventoryBalance.upsert({
        where: { warehouseId_partId: { warehouseId, partId } },
        create: { warehouseId, warehouseName: wh.name, partId, partNo: item.partNo, partName: item.name, partModel: item.spec || '', quantityOnHand: 0, quantityAvailable: 0, quantityReserved: 0, quantityDamaged: 0 },
        update: {},
      });

      const newQty = balance.quantityOnHand + quantity;
      if (newQty < 0) {
        throw new BadRequestException(
          `库存不足: 当前在库 ${balance.quantityOnHand}, 减少 ${Math.abs(quantity)} 将导致负数`,
        );
      }
      if (newQty < balance.quantityReserved) {
        throw new BadRequestException(
          `调整后库存不能小于已冻结数量: 调整后 ${newQty}, 已冻结 ${balance.quantityReserved}`,
        );
      }

      const updated = await tx.inventoryBalance.update({
        where: { id: balance.id, version: balance.version },
        data: { quantityOnHand: newQty, quantityAvailable: newQty - balance.quantityReserved, version: { increment: 1 } },
      });

      await tx.inventoryTransaction.create({
        data: { transactionNo: txnNo, type: quantity >= 0 ? 'ADJUST_IN' : 'ADJUST_OUT', direction: quantity >= 0 ? 'IN' : 'OUT',
          toWarehouseId: quantity >= 0 ? warehouseId : undefined, fromWarehouseId: quantity < 0 ? warehouseId : undefined, partId, partName: item.name, quantity: Math.abs(quantity), beforeQuantity: balance.quantityOnHand, afterQuantity: newQty,
          operatorId, operatorName, remark: reason, occurredAt: new Date() },
      });
      return updated;
    });
  }
}

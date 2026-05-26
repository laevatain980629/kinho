import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ReceiptsService {
  constructor(
    private prisma: PrismaService,
    private workOrdersService: WorkOrdersService,
    private inventoryService: InventoryService,
  ) {}

  async submit(workOrderId: number, data: {
    repairSummary: string;
    repairItems?: string;
    partItems?: string;
    chargeItems?: string;
    totalAmount?: number;
    createdById: number;
    operatorName?: string;
    operatorRole?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.workOrdersService.findById(workOrderId, tx);
      if (order.state !== 'REPAIRING') {
        throw new BadRequestException('当前工单状态不允许提交回执');
      }

      // 冻结个人仓库存（如果有关联配件）
      if (data.partItems) {
        try {
          const partItems = JSON.parse(data.partItems);
          if (Array.isArray(partItems) && order.engineerId) {
            const personalWarehouse = await tx.warehouse.findFirst({
              where: { ownerEngineerId: order.engineerId, type: 'ENGINEER_WAREHOUSE' },
            });
            if (personalWarehouse) {
              for (const item of partItems) {
                if (item.partId && item.quantity) {
                  await this.inventoryService.reserve(
                    personalWarehouse.id, item.partId, item.quantity,
                    'RECEIPT', workOrderId, data.createdById, 'engineer',
                    tx,
                  );
                }
              }
            }
          }
        } catch (e) {
          throw new BadRequestException(`配件库存操作失败: ${e instanceof Error ? e.message : '未知错误'}`);
        }
      }

      const receipt = await tx.repairReceipt.create({
        data: {
          workOrderId,
          repairSummary: data.repairSummary,
          repairItems: data.repairItems,
          partItems: data.partItems,
          chargeItems: data.chargeItems,
          totalAmount: data.totalAmount,
          status: 'PENDING_SIGNATURE',
          createdById: data.createdById,
        },
      });

      // 工单状态 → PENDING_SIGNATURE
      await this.workOrdersService.submitReceipt(
        workOrderId,
        data.createdById,
        data.operatorName,
        data.operatorRole,
        tx,
      );

      return receipt;
    });
  }

  async customerSign(receiptId: number, data: {
    customerName: string;
    customerPhone?: string;
    signatureUrl: string;
    signedAt: Date;
    signedOnDevice?: string;
    operatorId: number;
    operatorName?: string;
    operatorRole?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.repairReceipt.findUnique({ where: { id: receiptId } });
      if (!receipt) throw new NotFoundException('回执不存在');
      if (receipt.status !== 'PENDING_SIGNATURE') {
        throw new BadRequestException('回执状态不允许签字');
      }

      const updated = await tx.repairReceipt.update({
        where: { id: receiptId },
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          signatureUrl: data.signatureUrl,
          signedAt: data.signedAt,
          signedByName: data.customerName,
          signedOnDevice: data.signedOnDevice,
          status: 'SIGNED',
        },
      });

      // 冻结库存转实际消耗
      if (receipt.partItems) {
        try {
          const partItems = JSON.parse(receipt.partItems);
          const order = await this.workOrdersService.findById(receipt.workOrderId, tx);

          if (Array.isArray(partItems) && order.engineerId) {
            const personalWarehouse = await tx.warehouse.findFirst({
              where: { ownerEngineerId: order.engineerId, type: 'ENGINEER_WAREHOUSE' },
            });
            if (personalWarehouse) {
              for (const item of partItems) {
                if (item.partId && item.quantity) {
                  await this.inventoryService.consume(
                    personalWarehouse.id, item.partId, item.quantity,
                    'RECEIPT', receipt.workOrderId,
                    order.engineerId, 'engineer',
                    tx,
                  );
                }
              }
            }
          }
        } catch (e) {
          throw new BadRequestException(`库存消耗失败: ${e instanceof Error ? e.message : '未知错误'}`);
        }
      }

      // 工单状态 → REPAIR_COMPLETED
      await this.workOrdersService.customerSign(
        receipt.workOrderId,
        data.operatorId,
        data.operatorName,
        data.operatorRole,
        tx,
      );

      return updated;
    });
  }

  async findById(id: number) {
    const receipt = await this.prisma.repairReceipt.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException('回执不存在');
    return receipt;
  }

  async findByWorkOrder(workOrderId: number) {
    return this.prisma.repairReceipt.findMany({
      where: { workOrderId, status: { not: 'VOIDED' } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

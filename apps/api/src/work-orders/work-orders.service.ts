import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { SequenceService } from '../common/services/sequence.service';
import { WorkOrderState, canTransition } from '../common/enums/work-order-states';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryService } from '../inventory/inventory.service';
import { QuoteStatus } from '../common/enums/quote-states';

type WorkOrderDbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class WorkOrdersService {
  private readonly logger = new Logger(WorkOrdersService.name);

  private static readonly SYSTEM_OPERATOR = { id: 0, name: 'system' } as const;

  constructor(
    private prisma: PrismaService,
    private sequence: SequenceService,
    private notifications: NotificationsService,
    private inventoryService: InventoryService,
  ) {}

  private async generateOrderNo(): Promise<string> {
    return this.sequence.next('WO', 'WorkOrder', 'orderNo');
  }

  async findAll(params: {
    keyword?: string;
    state?: string;
    priority?: string;
    outletId?: number;
    operatorId?: number;
    operatorRole?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { keyword, state, priority, outletId, operatorId, operatorRole, page = 1, pageSize = 20 } = params;

    const where: Prisma.WorkOrderWhereInput = {};

    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword } },
        { title: { contains: keyword } },
        { officialTitle: { contains: keyword } },
        { customerNameSnapshot: { contains: keyword } },
        { customerPhoneSnapshot: { contains: keyword } },
        { machineSerialSnapshot: { contains: keyword } },
      ];
    }

    if (state) where.state = state;
    if (priority) where.priority = priority;
    if (outletId !== undefined) where.outletId = outletId;

    // 角色数据过滤
    if (operatorRole === 'engineer') {
      const user = operatorId ? await this.prisma.user.findUnique({ where: { id: operatorId }, select: { outletId: true } }) : null;
      if (user?.outletId) {
        where.AND = [
          { engineerId: operatorId },
          { outletId: user.outletId },
        ];
      } else {
        where.engineerId = operatorId;
      }
    } else if (operatorRole === 'outlet_manager') {
      const user = operatorId ? await this.prisma.user.findUnique({ where: { id: operatorId }, select: { outletId: true } }) : null;
      if (user?.outletId) {
        where.outletId = user.outletId;
      }
    } else if (operatorRole === 'follow_up_specialist') {
      where.state = 'FOLLOW_UP_PENDING';
    }
    // admin / hq_service: no restriction

    const [list, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        include: {
          outlet: { select: { id: true, name: true } },
          engineer: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      list: list.map((wo: any) => ({
        ...wo,
        outletName: wo.outlet?.name || null,
        engineerName: wo.engineer?.name || wo.engineerName || null,
        creatorName: wo.creator?.name || null,
      })),
      total, page, pageSize,
    };
  }

  async findById(
    id: number,
    client: WorkOrderDbClient = this.prisma,
    viewer?: { id?: number; role?: string },
  ) {
    const workOrder: any = await client.workOrder.findUnique({
      where: { id },
      include: {
        outlet: { select: { id: true, name: true } },
        engineer: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        machine: { select: { id: true, serialNo: true, model: true, purchaseDate: true, warrantyStartDate: true, warrantyEndDate: true, warrantyMonths: true, warrantyPolicy: true, warrantyRemark: true } },
        creator: { select: { id: true, name: true } },
        receipts: { where: { status: { not: 'VOIDED' } }, orderBy: { createdAt: 'desc' } },
        histories: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!workOrder) throw new NotFoundException('工单不存在');
    const result = {
      ...workOrder,
      outletName: workOrder.outlet?.name || null,
      engineerName: workOrder.engineer?.name || workOrder.engineerName || null,
      machineModelSnapshot: workOrder.machineModelSnapshot || workOrder.machine?.model || null,
      machineSerialSnapshot: workOrder.machineSerialSnapshot || workOrder.machine?.serialNo || null,
      creatorName: workOrder.creator?.name || null,
    };

    if (viewer) {
      await this.assertCanViewWorkOrder(result, viewer);
    }

    return result;
  }

  async create(data: {
    title: string;
    priority: string;
    source: string;
    customerNameSnapshot: string;
    customerPhoneSnapshot: string;
    serviceAddressSnapshot: string;
    faultDesc: string;
    customerId?: number;
    machineId?: number;
    machineSerialSnapshot?: string;
    machineModelSnapshot?: string;
    outletId?: number;
    estimatedCost?: number;
    creatorId?: number;
  }) {
    const orderNo = await this.generateOrderNo();
    const customer = data.customerId
      ? await this.prisma.customer.findUnique({ where: { id: data.customerId } })
      : null;
    const machine = data.machineId
      ? await this.prisma.machine.findUnique({ where: { id: data.machineId } })
      : null;
    const warrantySnapshot = await this.buildWarrantySnapshot(data.machineId);

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          orderNo,
          state: WorkOrderState.CREATED,
          title: data.title,
          priority: data.priority,
          source: data.source,
          customerNameSnapshot: customer?.name || data.customerNameSnapshot,
          customerPhoneSnapshot: customer?.contactPhone || data.customerPhoneSnapshot,
          serviceAddressSnapshot: data.serviceAddressSnapshot || customer?.address || '',
          faultDesc: data.faultDesc,
          customerId: data.customerId,
          machineId: data.machineId,
          machineSerialSnapshot: machine?.serialNo || data.machineSerialSnapshot,
          machineModelSnapshot: machine?.model || data.machineModelSnapshot,
          outletId: data.outletId,
          creatorId: data.creatorId,
          ...warrantySnapshot,
          estimatedCost: data.estimatedCost != null ? new Prisma.Decimal(data.estimatedCost) : undefined,
        },
      });

      await tx.workOrderHistory.create({
        data: {
          workOrderId: workOrder.id,
          action: WorkOrderState.CREATED,
          fromState: null,
          toState: WorkOrderState.CREATED,
          operatorId: data.creatorId,
        },
      });

      return workOrder;
    });
  }

  private async buildWarrantySnapshot(machineId?: number, serviceDate = new Date()): Promise<WarrantySnapshot> {
    if (!machineId) {
      return {
        warrantyStatus: 'UNKNOWN',
        warrantyJudgedAt: serviceDate,
      };
    }

    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      select: {
        purchaseDate: true,
        warrantyStartDate: true,
        warrantyEndDate: true,
        warrantyPolicy: true,
        currentHours: true,
      },
    });

    if (!machine) {
      return {
        warrantyStatus: 'UNKNOWN',
        warrantyJudgedAt: serviceDate,
      };
    }

    const warrantyStart = machine.warrantyStartDate || machine.purchaseDate || null;
    const warrantyEnd = machine.warrantyEndDate || (warrantyStart ? this.addYears(warrantyStart, 1) : null);
    const withinHours = machine.currentHours != null && Number(machine.currentHours) <= 3000;
    const withinDate = warrantyEnd ? serviceDate.getTime() <= warrantyEnd.getTime() : false;

    if (withinHours || withinDate) {
      return {
        warrantyStatus: 'IN_WARRANTY',
        isUnderWarranty: true,
        warrantyExpiry: warrantyEnd,
        warrantyStartSnapshot: warrantyStart,
        warrantyEndSnapshot: warrantyEnd,
        warrantyPolicySnapshot: machine.warrantyPolicy || '3000工作小时内或客户收货一年内',
        warrantyJudgedAt: serviceDate,
      };
    }

    if (machine.currentHours == null || !warrantyEnd) {
      return {
        warrantyStatus: 'UNKNOWN',
        warrantyStartSnapshot: warrantyStart,
        warrantyEndSnapshot: warrantyEnd,
        warrantyPolicySnapshot: machine.warrantyPolicy || '3000工作小时内或客户收货一年内',
        warrantyJudgedAt: serviceDate,
      };
    }

    return {
      warrantyStatus: 'OUT_OF_WARRANTY',
      isUnderWarranty: false,
      warrantyExpiry: warrantyEnd,
      warrantyStartSnapshot: warrantyStart,
      warrantyEndSnapshot: warrantyEnd,
      warrantyPolicySnapshot: machine.warrantyPolicy || '3000工作小时内或客户收货一年内',
      warrantyJudgedAt: serviceDate,
    };
  }

  private addYears(date: Date, years: number) {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  private async assertRepairCanStartByWarranty(id: number) {
    const order = await this.prisma.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        warrantyStatus: true,
        isUnderWarranty: true,
        quotes: { select: { id: true, status: true } },
      },
    });

    if (!order) throw new NotFoundException('工单不存在');

    const isUnknownWarranty = order.warrantyStatus === 'UNKNOWN' || (order.warrantyStatus == null && order.isUnderWarranty == null);
    if (isUnknownWarranty) {
      throw new BadRequestException('工单三包状态未确认，不能开始维修');
    }

    const isOutOfWarranty = order.warrantyStatus === 'OUT_OF_WARRANTY' || order.isUnderWarranty === false;
    if (!isOutOfWarranty) return;

    const hasCustomerConfirmedQuote = order.quotes.some((quote) => quote.status === QuoteStatus.CUSTOMER_CONFIRMED);
    if (!hasCustomerConfirmedQuote) {
      throw new BadRequestException('三包外工单需客户确认报价后才能开始维修');
    }
  }

  /**
   * Generic state transition with validation and history recording.
   */
  async transition(
    id: number,
    toState: WorkOrderState,
    extraData?: Record<string, unknown>,
    operatorId?: number,
    operatorName?: string,
    operatorRole?: string,
    client: WorkOrderDbClient = this.prisma,
  ): Promise<any> {
    const workOrder = await this.findById(id, client);
    const fromState = workOrder.state as WorkOrderState;

    if (!canTransition(fromState, toState)) {
      throw new BadRequestException(
        `状态流转无效: ${fromState} -> ${toState}`,
      );
    }

    const timestampField = this.getTimestampField(toState);

    // Split extraData: WorkOrder fields go to update, rest to history payload
    const woFields = ['priority','outletId','engineerId','customerId','machineId','faultDesc','holdReason','holdStatus','blockReason','officialTitle','acceptRemark','faultTypeIdsJson','faultTypeNamesSnapshot','faultCause','faultPhotos','suggestedRepairPlan','needQuote','needParts','needProcurement'];
    const woData: Record<string, unknown> = {};
    const historyPayload: Record<string, unknown> = {};
    if (extraData) {
      for (const [k, v] of Object.entries(extraData)) {
        if (woFields.includes(k)) woData[k] = v;
        else historyPayload[k] = v;
      }
    }

    // REPAIR_COMPLETED writes both customerSignedAt and completedAt
    const timestampData: Record<string, Date> = {};
    if (timestampField) timestampData[timestampField] = new Date();
    if (toState === WorkOrderState.REPAIR_COMPLETED) {
      timestampData.completedAt = new Date();
    }

    const updated = await client.workOrder.update({
      where: { id },
      data: {
        state: toState,
        stateEnteredAt: new Date(),
        ...timestampData,
        ...woData,
      },
    });

    await client.workOrderHistory.create({
      data: {
        workOrderId: id,
        action: toState,
        fromState,
        toState,
        operatorId,
        operatorName,
        operatorRole,
        payload: Object.keys(historyPayload).length > 0 ? JSON.stringify(historyPayload) : null,
      },
    });

    // 发送站内通知（异步，不阻塞状态流转）
    try { await this.notifyForState(updated, toState, operatorName); } catch (e) { this.logger.warn('通知发送失败', e) }

    // 维修完成后自动转入待回访
    if (toState === WorkOrderState.REPAIR_COMPLETED) {
      const followUp = await this.transition(id, WorkOrderState.FOLLOW_UP_PENDING, undefined, operatorId, operatorName, operatorRole, client);
      return followUp;
    }

    if (toState === WorkOrderState.FOLLOW_UP_PENDING) {
      await this.ensureFollowUpTask(id, client);
    }

    return updated;
  }

  private async ensureFollowUpTask(workOrderId: number, client: WorkOrderDbClient = this.prisma) {
    const existing = await client.followUp.findFirst({ where: { workOrderId } });
    if (existing) return existing;

    const specialist = await client.user.findFirst({
      where: { role: 'follow_up_specialist', status: 'ACTIVE' },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    if (!specialist) {
      this.logger.warn(`工单 ${workOrderId} 已进入待回访，但没有可用回访专员`);
      return null;
    }

    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const countToday = await client.followUp.count({
      where: { followUpNo: { startsWith: `FU-${datePart}-` } },
    });

    return client.followUp.create({
      data: {
        followUpNo: `FU-${datePart}-${String(countToday + 1).padStart(4, '0')}`,
        workOrderId,
        specialistId: specialist.id,
        status: 'PENDING',
      },
    });
  }

  private async notifyForState(wo: any, toState: WorkOrderState, operatorName?: string) {
    const op = operatorName || '系统';
    const title = `工单 ${wo.orderNo}`;

    switch (toState) {
      case WorkOrderState.ACCEPTED:
        await this.notifications.notifyRole(
          'hq_service',
          title,
          `${op} 已受理工单，请分配服务网点`,
          'work_order', wo.id,
        );
        break;

      case WorkOrderState.OUTLET_ASSIGNED:
        if (wo.outletId) {
          await this.notifications.notifyOutletManagers(
            wo.outletId,
            title,
            `${op} 已分配网点，请指派工程师`,
            'work_order', wo.id,
          );
        }
        break;

      case WorkOrderState.ENGINEER_ASSIGNED:
        if (wo.engineerId) {
          await this.notifications.notifyEngineer(
            wo.engineerId,
            title,
            `${op} 已指派您处理，请尽快签到`,
            'work_order', wo.id,
          );
        }
        break;

      case WorkOrderState.FAULT_CONFIRMED:
        if (wo.engineerId) {
          await this.notifications.notifyEngineer(
            wo.engineerId,
            title,
            '故障已确认，请开始维修',
            'work_order', wo.id,
          );
        }
        break;

      case WorkOrderState.REPAIRING:
        if (wo.engineerId) {
          await this.notifications.notifyEngineer(
            wo.engineerId,
            title,
            '维修中，完成后请提交回执',
            'work_order', wo.id,
          );
        }
        break;

      case WorkOrderState.REPAIR_COMPLETED:
        await this.notifications.notifyRole(
          'follow_up_specialist',
          title,
          `${op} 已完成维修，请安排回访`,
          'work_order', wo.id,
        );
        break;

      case WorkOrderState.FOLLOW_UP_PENDING:
        await this.notifications.notifyRole(
          'follow_up_specialist',
          title,
          `${op} 将工单转入回访阶段`,
          'work_order', wo.id,
        );
        break;
    }
  }

  private getTimestampField(state: WorkOrderState): string | null {
    const map: Record<string, string> = {
      [WorkOrderState.ACCEPTED]: 'acceptedAt',
      [WorkOrderState.OUTLET_ASSIGNED]: 'outletAssignedAt',
      [WorkOrderState.ENGINEER_ASSIGNED]: 'engineerAssignedAt',
      [WorkOrderState.SIGNED_IN]: 'signedInAt',
      [WorkOrderState.FAULT_CONFIRMED]: 'faultConfirmedAt',
      [WorkOrderState.REPAIRING]: 'repairStartedAt',
      [WorkOrderState.PENDING_SIGNATURE]: 'receiptSubmittedAt',
      [WorkOrderState.REPAIR_COMPLETED]: 'customerSignedAt',
      [WorkOrderState.CLOSED]: 'closedAt',
    };
    return map[state] || null;
  }

  /** 校验操作人是否为工单指派的工程师或管理员 */
  private async verifyEngineerOrAdmin(workOrderId: number, operatorId?: number, operatorRole?: string, client: WorkOrderDbClient = this.prisma) {
    if (operatorRole === 'admin') return;
    const wo = await this.findById(workOrderId, client);
    if (wo.engineerId && wo.engineerId !== operatorId) {
      throw new BadRequestException('只有指派的工程师或管理员可以执行此操作');
    }
  }

  private async assertCanViewWorkOrder(workOrder: any, viewer?: { id?: number; role?: string }) {
    if (!viewer?.id || !viewer.role) {
      throw new NotFoundException('工单不存在');
    }

    if (['admin', 'hq_service', 'supervisor', 'chief_engineer'].includes(viewer.role)) {
      return;
    }

    if (viewer.role === 'engineer' && workOrder.engineerId === viewer.id) {
      return;
    }

    if (viewer.role === 'outlet_manager') {
      const user = await this.prisma.user.findUnique({
        where: { id: viewer.id },
        select: { outletId: true },
      });
      if (user?.outletId && user.outletId === workOrder.outletId) {
        return;
      }
    }

    if (viewer.role === 'follow_up_specialist' && workOrder.state === WorkOrderState.FOLLOW_UP_PENDING) {
      return;
    }

    throw new NotFoundException('工单不存在');
  }

  /** 校验操作人是否为回访专员或管理员 */
  private verifyFollowUpOrAdmin(operatorRole?: string) {
    if (operatorRole === 'admin' || operatorRole === 'follow_up_specialist') return;
    throw new BadRequestException('只有回访专员或管理员可以执行此操作');
  }

  /** 校验操作人是否为该工单网点的经理或管理员 */
  private async verifyOutletManager(workOrderId: number, operatorId?: number, operatorRole?: string) {
    if (operatorRole === 'admin') return;
    if (operatorRole === 'outlet_manager') {
      const wo = await this.findById(workOrderId);
      const user = await this.prisma.user.findUnique({ where: { id: operatorId }, select: { outletId: true } });
      if (user && user.outletId === wo.outletId) return;
    }
    throw new BadRequestException('只有该网点的经理或管理员可以执行此操作');
  }

  /** 校验被分配工程师必须属于工单当前服务网点 */
  private async verifyEngineerInWorkOrderOutlet(workOrderId: number, engineerId: number) {
    const [workOrder, engineer] = await Promise.all([
      this.prisma.workOrder.findUnique({
        where: { id: workOrderId },
        select: { outletId: true, outlet: { select: { name: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: engineerId },
        select: { id: true, name: true, role: true, status: true, outletId: true, outlet: { select: { name: true } } },
      }),
    ]);

    if (!workOrder) throw new NotFoundException('工单不存在');
    if (!workOrder.outletId) throw new BadRequestException('请先为工单分配服务网点');
    if (!engineer) throw new BadRequestException('工程师不存在');
    if (engineer.role !== 'engineer') throw new BadRequestException('只能分配维修工程师账号');
    if (engineer.status !== 'ACTIVE') throw new BadRequestException('不能分配已禁用的工程师');
    if (engineer.outletId !== workOrder.outletId) {
      throw new BadRequestException(
        `工程师${engineer.name}属于${engineer.outlet?.name || '未分配网点'}，不能分配到${workOrder.outlet?.name || '当前网点'}的工单`,
      );
    }
  }

  // --- Shortcut methods ---

  accept(id: number, operatorId?: number, operatorName?: string, operatorRole?: string, data?: { priority?: string; remark?: string; officialTitle?: string }) {
    if (data?.priority) {
      this.prisma.workOrder.update({ where: { id }, data: { priority: data.priority } }).catch(() => {});
    }
    const transitionData: Record<string, unknown> = {};
    if (data?.priority) transitionData.priority = data.priority;
    if (data?.officialTitle?.trim()) transitionData.officialTitle = data.officialTitle.trim();
    if (data?.remark?.trim()) transitionData.acceptRemark = data.remark.trim();
    return this.transition(id, WorkOrderState.ACCEPTED, transitionData, operatorId, operatorName, operatorRole);
  }

  assignOutlet(id: number, outletId: number, operatorId?: number, operatorName?: string, operatorRole?: string, data?: { dispatchReason?: string; expectedArriveAt?: string }) {
    return this.transition(id, WorkOrderState.OUTLET_ASSIGNED, { outletId, ...data }, operatorId, operatorName, operatorRole);
  }

  async assignEngineer(id: number, engineerId: number, operatorId?: number, operatorName?: string, operatorRole?: string) {
    await this.verifyOutletManager(id, operatorId, operatorRole);
    await this.verifyEngineerInWorkOrderOutlet(id, engineerId);
    const engineer = await this.prisma.user.findUnique({ where: { id: engineerId }, select: { name: true } });
    return this.transition(id, WorkOrderState.ENGINEER_ASSIGNED, { engineerId, assignedEngineerName: engineer?.name || `ID:${engineerId}` }, operatorId, operatorName, operatorRole);
  }

  async signIn(id: number, operatorId?: number, operatorName?: string, operatorRole?: string) {
    await this.verifyEngineerOrAdmin(id, operatorId, operatorRole);
    return this.transition(id, WorkOrderState.SIGNED_IN, undefined, operatorId, operatorName, operatorRole);
  }

  async confirmFault(id: number, data?: { faultTypeIds?: number[]; faultDesc?: string; faultCause?: string; faultPhotos?: string[]; suggestedRepairPlan?: string; needQuote?: boolean; needParts?: boolean; needProcurement?: boolean }, operatorId?: number, operatorName?: string, operatorRole?: string) {
    await this.verifyEngineerOrAdmin(id, operatorId, operatorRole);

    const transitionData: Record<string, unknown> = { ...data };
    if (Array.isArray(data?.faultPhotos)) {
      transitionData.faultPhotos = data.faultPhotos.length > 0
        ? JSON.stringify(data.faultPhotos)
        : null;
    }

    // Query fault type names and save snapshot
    if (data?.faultTypeIds?.length) {
      const faultTypes = await this.prisma.faultType.findMany({
        where: { id: { in: data.faultTypeIds }, status: 'ACTIVE' },
        select: { id: true, name: true },
      });
      transitionData.faultTypeIdsJson = JSON.stringify(data.faultTypeIds);
      transitionData.faultTypeNamesSnapshot = JSON.stringify(faultTypes.map((ft) => ft.name));
    }

    return this.transition(id, WorkOrderState.FAULT_CONFIRMED, transitionData, operatorId, operatorName, operatorRole);
  }

  async startRepair(id: number, operatorId?: number, operatorName?: string, operatorRole?: string) {
    await this.verifyEngineerOrAdmin(id, operatorId, operatorRole);
    await this.assertRepairCanStartByWarranty(id);
    return this.transition(id, WorkOrderState.REPAIRING, undefined, operatorId, operatorName, operatorRole);
  }

  async submitReceipt(id: number, operatorId?: number, operatorName?: string, operatorRole?: string, client: WorkOrderDbClient = this.prisma) {
    await this.verifyEngineerOrAdmin(id, operatorId, operatorRole, client);
    return this.transition(id, WorkOrderState.PENDING_SIGNATURE, undefined, operatorId, operatorName, operatorRole, client);
  }

  async customerSign(id: number, operatorId?: number, operatorName?: string, operatorRole?: string, client: WorkOrderDbClient = this.prisma) {
    await this.verifyEngineerOrAdmin(id, operatorId, operatorRole, client);
    return this.transition(id, WorkOrderState.REPAIR_COMPLETED, undefined, operatorId, operatorName, operatorRole, client);
  }

  moveToFollowUp(id: number, operatorId?: number, operatorName?: string, operatorRole?: string) {
    return this.transition(id, WorkOrderState.FOLLOW_UP_PENDING, undefined, operatorId, operatorName, operatorRole);
  }

  close(id: number, operatorId?: number, operatorName?: string, operatorRole?: string, client: WorkOrderDbClient = this.prisma) {
    this.verifyFollowUpOrAdmin(operatorRole);
    return this.transition(id, WorkOrderState.CLOSED, undefined, operatorId, operatorName, operatorRole, client);
  }

  reopen(id: number, operatorId?: number, operatorName?: string, operatorRole?: string) {
    this.verifyFollowUpOrAdmin(operatorRole);
    return this.transition(id, WorkOrderState.FOLLOW_UP_PENDING, undefined, operatorId, operatorName, operatorRole);
  }

  async confirmCancel(id: number, operatorId?: number, operatorName?: string, operatorRole?: string) {
    if (operatorRole !== 'admin' && operatorRole !== 'supervisor') {
      throw new BadRequestException('只有主管或管理员可以确认取消');
    }
    const order = await this.findById(id);
    if (order.holdStatus !== 'HELD') {
      throw new BadRequestException('工单未挂起，无法确认取消');
    }
    if (!order.holdReason?.startsWith('申请取消')) {
      throw new BadRequestException('挂起原因非取消申请，无法确认取消');
    }
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { state: 'CANCELLED', holdStatus: null, holdReason: null, updatedAt: new Date() },
    });
    await this.prisma.workOrderHistory.create({
      data: { workOrderId: id, action: 'CANCELLED', fromState: order.state, toState: 'CANCELLED', operatorId, operatorName, operatorRole },
    });
    return updated;
  }

  async returnToRepair(id: number, operatorId?: number, operatorName?: string, operatorRole?: string) {
    this.verifyFollowUpOrAdmin(operatorRole);
    const updated = await this.transition(id, WorkOrderState.REPAIRING, undefined, operatorId, operatorName, operatorRole);

    // 通知主管：回访异常退回维修
    try {
      await this.notifications.notifyRole(
        'supervisor',
        `工单 ${updated.orderNo} 回访异常退回维修`,
        `${operatorName || '回访专员'} 将工单退回维修阶段`,
        'work_order', id,
      );
    } catch (e) { this.logger.warn('通知发送失败', e) }

    return updated;
  }

  async cancel(id: number, operatorId?: number, operatorName?: string, operatorRole?: string) {
    const partsRequests = await this.prisma.partsRequest.findMany({
      where: { workOrderId: id, status: 'APPROVED' },
      include: { items: true },
    });
    for (const pr of partsRequests) {
      for (const item of pr.items) {
        try {
          await this.inventoryService.release(pr.fromWarehouseId, item.partId, item.reservedQuantity || item.quantity, operatorId ?? WorkOrdersService.SYSTEM_OPERATOR.id, operatorName ?? WorkOrdersService.SYSTEM_OPERATOR.name);
        } catch (e) { this.logger.warn(`取消工单释放预留失败: PR=${pr.requestNo}`, e); }
      }
    }

    const order = await this.findById(id);
    if (order.holdStatus === 'HELD' && order.holdReason?.startsWith('等待配件申请')) {
      await this.prisma.workOrder.update({
        where: { id },
        data: { holdStatus: null, holdReason: null },
      });
    }

    return this.transition(id, WorkOrderState.CANCELLED, undefined, operatorId, operatorName, operatorRole);
  }

  async hold(id: number, reason: string, operatorId?: number, operatorName?: string, operatorRole?: string) {
    await this.verifyEngineerOrAdmin(id, operatorId, operatorRole);
    const order = await this.findById(id);
    if (order.state === 'CLOSED' || order.state === 'CANCELLED') {
      throw new BadRequestException('已关闭或已取消的工单无法挂起');
    }
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { holdStatus: 'HELD', holdReason: reason, updatedAt: new Date() },
    });

    await this.prisma.workOrderHistory.create({
      data: {
        workOrderId: id,
        action: 'HELD',
        fromState: order.state,
        toState: order.state,
        operatorId,
        operatorName,
        operatorRole,
        reason,
      },
    });

    try {
      await this.notifications.notifyRole(
        'supervisor',
        `工单 ${order.orderNo} 已挂起`,
        `挂起原因: ${reason}`,
        'work_order', id,
      );
    } catch (e) { this.logger.warn('通知发送失败', e) }

    return updated;
  }

  async unhold(id: number, operatorId?: number, operatorName?: string, operatorRole?: string) {
    await this.verifyEngineerOrAdmin(id, operatorId, operatorRole);
    const order = await this.findById(id);
    if (order.holdStatus !== 'HELD') {
      throw new BadRequestException('工单未挂起，无需解挂');
    }
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { holdStatus: null, holdReason: null, updatedAt: new Date() },
    });

    await this.prisma.workOrderHistory.create({
      data: {
        workOrderId: id,
        action: 'UNHELD',
        fromState: order.state,
        toState: order.state,
        operatorId,
        operatorName,
        operatorRole,
      },
    });

    // 通知工单的工程师可以继续
    if (order.engineerId) {
      try {
        await this.notifications.notifyEngineer(
          order.engineerId,
          `工单 ${order.orderNo} 已解除挂起`,
          '挂起已解除，请继续维修',
          'work_order', id,
        );
      } catch (e) { this.logger.warn('通知发送失败', e) }
    }

    return updated;
  }

  async getHistory(id: number, viewer?: { id?: number; role?: string }) {
    if (viewer) {
      const workOrder = await this.findById(id);
      await this.assertCanViewWorkOrder(workOrder, viewer);
    }

    return this.prisma.workOrderHistory.findMany({
      where: { workOrderId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}

type WarrantySnapshot = {
  warrantyExpiry?: Date | null;
  isUnderWarranty?: boolean | null;
  warrantyStatus?: string | null;
  warrantyPolicySnapshot?: string | null;
  warrantyStartSnapshot?: Date | null;
  warrantyEndSnapshot?: Date | null;
  warrantyJudgedAt?: Date | null;
  warrantyOverrideReason?: string | null;
};

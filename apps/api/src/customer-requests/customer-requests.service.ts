import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateCustomerRequestDto } from './dto/create-customer-request.dto';

const PHONE_RATE_WINDOW_MINUTES = 10;
const PHONE_RATE_MAX_SUBMISSIONS = 2;
const IP_RATE_WINDOW_MINUTES = 10;
const IP_RATE_MAX_SUBMISSIONS = 10;
const DUPLICATE_WINDOW_MINUTES = 30;

@Injectable()
export class CustomerRequestsService {
  constructor(private prisma: PrismaService) {}

  private async generateRequestNo(): Promise<string> {
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const prefix = `CR-${datePart}-`;

    const last = await this.prisma.customerRequest.findFirst({
      where: { requestNo: { startsWith: prefix } },
      orderBy: { requestNo: 'desc' },
    });

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.requestNo.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async create(data: CreateCustomerRequestDto, ip?: string, userAgent?: string) {
    // 蜜罐检测 — 如果隐藏字段被填写，返回假成功，不创建记录
    if ((data as any).website) {
      const fakeNo = await this.generateRequestNo();
      return { requestNo: fakeNo, message: '提交成功，工作人员会尽快联系您' };
    }

    // TODO: move these rate-limit thresholds to environment configuration.
    const phoneWindowStart = new Date(Date.now() - PHONE_RATE_WINDOW_MINUTES * 60 * 1000);

    // 同手机号 10 分钟内最多 2 次
    const phoneCount = await this.prisma.customerRequest.count({
      where: { phone: data.phone, createdAt: { gte: phoneWindowStart } },
    });
    if (phoneCount >= PHONE_RATE_MAX_SUBMISSIONS) {
      throw new BadRequestException('该手机号提交过于频繁，请稍后再试');
    }

    // 同 IP 10 分钟内最多 10 次
    if (ip) {
      const ipWindowStart = new Date(Date.now() - IP_RATE_WINDOW_MINUTES * 60 * 1000);
      const ipCount = await this.prisma.customerRequest.count({
        where: { ip, createdAt: { gte: ipWindowStart } },
      });
      if (ipCount >= IP_RATE_MAX_SUBMISSIONS) {
        throw new BadRequestException('请求过于频繁，请稍后再试');
      }
    }

    // 同手机号 + 同设备序列号 + 相似故障描述 30 分钟内去重
    if (data.machineSerial && data.submitFingerprint) {
      const duplicateWindowStart = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000);
      const duplicate = await this.prisma.customerRequest.findFirst({
        where: {
          phone: data.phone,
          machineSerial: data.machineSerial,
          createdAt: { gte: duplicateWindowStart },
          status: { not: 'REJECTED' },
        },
      });
      if (duplicate) {
        return { requestNo: duplicate.requestNo, message: '已收到报修，请勿重复提交' };
      }
    }

    const requestNo = await this.generateRequestNo();

    const request = await this.prisma.customerRequest.create({
      data: {
        requestNo,
        customerName: data.customerName,
        phone: data.phone,
        company: data.company,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        locationAccuracy: data.locationAccuracy,
        machineSerial: data.machineSerial,
        machineCode: data.machineCode,
        machineModel: data.machineModel,
        faultDesc: data.faultDesc,
        faultPhotos: data.faultPhotos,
        submitFingerprint: data.submitFingerprint,
        ip,
        userAgent,
        status: 'SUBMITTED',
      },
    });

    return { requestNo: request.requestNo, message: '提交成功，工作人员会尽快联系您' };
  }

  async findAll(params: { keyword?: string; status?: string; page?: number; pageSize?: number }) {
    const { keyword, status, page = 1, pageSize = 20 } = params;
    const where: any = {};

    if (keyword) {
      where.OR = [
        { requestNo: { contains: keyword } },
        { customerName: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.customerRequest.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customerRequest.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async findById(id: number) {
    const request = await this.prisma.customerRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('报修申请不存在');
    return request;
  }

  private addYears(date: Date, years: number) {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  private async buildWarrantySnapshot(machineId: number) {
    const serviceDate = new Date();
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
      return { warrantyStatus: 'UNKNOWN', warrantyJudgedAt: serviceDate };
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

  async accept(id: number, data: { customerId?: number; machineId?: number; outletId?: number; officialTitle?: string; remark?: string } = {}, operator?: { id?: number; name?: string; role?: string }) {
    const request = await this.findById(id);
    if (request.status !== 'SUBMITTED') {
      throw new BadRequestException('当前状态不允许受理');
    }
    if (!data.customerId || !data.machineId) {
      throw new BadRequestException('受理客户报修前必须绑定真实客户和设备');
    }

    const machine = await this.prisma.machine.findUnique({
      where: { id: data.machineId },
      include: {
        customer: { select: { id: true, name: true, contactPhone: true, address: true, outletId: true } },
      },
    });
    if (!machine || machine.status !== 'ACTIVE') {
      throw new BadRequestException('请选择有效在用设备');
    }
    if (machine.customerId !== data.customerId) {
      throw new BadRequestException('所选设备不属于所选客户');
    }
    const warrantySnapshot = await this.buildWarrantySnapshot(machine.id);

    const orderNo = await this.generateOrderNo();
    const workOrder = await this.prisma.$transaction(async (tx) => {
      // 原子抢占：防止并发重复创建工单
      const seized = await tx.customerRequest.updateMany({
        where: { id, status: 'SUBMITTED' },
        data: { status: 'PROCESSING' },
      });
      if (seized.count !== 1) {
        throw new BadRequestException('该申请已被处理');
      }

      const autoTitle = `报修-${machine.customer.name}-${machine.model}`;
      const officialTitle = data.officialTitle?.trim() || autoTitle;
      const customerTitleSnapshot = `报修-${request.customerName}-${request.machineModel || request.machineSerial || '未知设备'}`;

      const created = await tx.workOrder.create({
        data: {
          orderNo,
          title: officialTitle,
          officialTitle,
          customerTitleSnapshot,
          acceptRemark: data.remark?.trim() || null,
          state: 'CREATED',
          priority: 'NORMAL',
          source: request.source || 'CUSTOMER_H5',
          customerId: machine.customerId,
          machineId: machine.id,
          outletId: data.outletId || machine.outletId || machine.customer.outletId,
          customerNameSnapshot: machine.customer.name,
          customerPhoneSnapshot: machine.customer.contactPhone || request.phone,
          serviceAddressSnapshot: request.address || machine.customer.address || '',
          machineSerialSnapshot: machine.serialNo,
          machineModelSnapshot: machine.model,
          faultDesc: request.faultDesc,
          faultPhotos: request.faultPhotos || null,
          creatorId: operator?.id,
          ...warrantySnapshot,
        },
      });

      await tx.workOrderHistory.create({
        data: {
          workOrderId: created.id,
          action: 'CREATED',
          fromState: null,
          toState: 'CREATED',
          operatorId: operator?.id,
          operatorName: operator?.name || '系统',
          operatorRole: operator?.role || 'system',
          platform: 'PC',
          payload: JSON.stringify({
            customerRequestId: request.id,
            customerTitleSnapshot,
            officialTitle,
            acceptRemark: data.remark?.trim() || null,
            customerInput: {
              customerName: request.customerName,
              phone: request.phone,
              machineSerial: request.machineSerial,
              machineModel: request.machineModel,
              faultPhotos: request.faultPhotos,
              latitude: request.latitude,
              longitude: request.longitude,
              locationAccuracy: request.locationAccuracy,
            },
          }),
        },
      });

      await tx.customerRequest.update({
        where: { id },
        data: { status: 'ACCEPTED', workOrderId: created.id },
      });

      return created;
    });

    return workOrder;
  }

  async reject(id: number, reason?: string) {
    const seized = await this.prisma.customerRequest.updateMany({
      where: { id, status: 'SUBMITTED' },
      data: { status: 'REJECTED', rejectReason: reason || null },
    });
    if (seized.count !== 1) {
      const exists = await this.prisma.customerRequest.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException('报修申请不存在');
      throw new BadRequestException('该申请已被处理');
    }

    return this.findById(id);
  }

  private async generateOrderNo(): Promise<string> {
    const now = new Date();
    const datePart =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const prefix = `WO-${datePart}-`;

    const last = await this.prisma.workOrder.findFirst({
      where: { orderNo: { startsWith: prefix } },
      orderBy: { orderNo: 'desc' },
    });

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.orderNo.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async findByPhone(phone: string) {
    const requests = await this.prisma.customerRequest.findMany({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const workOrderIds = requests
      .map((request) => request.workOrderId)
      .filter((id): id is number => typeof id === 'number');

    const workOrders = workOrderIds.length > 0
      ? await this.prisma.workOrder.findMany({
          where: { id: { in: workOrderIds } },
          include: {
            outlet: { select: { name: true } },
            engineer: { select: { name: true, username: true } },
          },
        })
      : [];
    const workOrderMap = new Map(workOrders.map((workOrder) => [workOrder.id, workOrder]));

    return requests.map((request) => {
      const workOrder = request.workOrderId ? workOrderMap.get(request.workOrderId) : null;
      return {
        id: request.id,
        requestNo: request.requestNo,
        orderNo: workOrder?.orderNo ?? request.requestNo,
        title: workOrder?.title ?? `报修-${request.customerName}-${request.machineModel || request.machineSerial || '未知设备'}`,
        state: workOrder?.state ?? request.status,
        status: request.status,
        rejectReason: request.rejectReason,
        createdAt: request.createdAt,
        outletName: workOrder?.outlet?.name ?? '待分配',
        engineerName: workOrder?.engineer?.name ?? workOrder?.engineer?.username ?? null,
        customerName: request.customerName,
        phone: request.phone,
        machineSerial: workOrder?.machineSerialSnapshot ?? request.machineSerial,
        faultDesc: workOrder?.faultDesc ?? request.faultDesc,
        workOrderId: request.workOrderId,
      };
    });
  }
}

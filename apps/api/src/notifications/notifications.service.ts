import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { userId: number; title: string; body: string; type?: string; refType?: string; refId?: number }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type || 'WORK_ORDER',
        refType: data.refType,
        refId: data.refId,
      },
    });
  }

  async findByUser(userId: number, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /** 通知指定角色的所有用户 */
  async notifyRole(role: string, title: string, body: string, refType?: string, refId?: number) {
    const users = await this.prisma.user.findMany({
      where: { role, status: 'ACTIVE' },
      select: { id: true },
    });
    for (const u of users) {
      await this.create({ userId: u.id, title, body, refType, refId });
    }
  }

  /** 通知指定网点的所有管理员 */
  async notifyOutletManagers(outletId: number, title: string, body: string, refType?: string, refId?: number) {
    const users = await this.prisma.user.findMany({
      where: { role: 'outlet_manager', outletId, status: 'ACTIVE' },
      select: { id: true },
    });
    for (const u of users) {
      await this.create({ userId: u.id, title, body, refType, refId });
    }
  }

  /** 通知指定工程师 */
  async notifyEngineer(engineerId: number, title: string, body: string, refType?: string, refId?: number) {
    await this.create({ userId: engineerId, title, body, refType, refId });
  }
}

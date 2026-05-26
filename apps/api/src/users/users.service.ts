import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private async ensureEngineerWarehouse(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { outlet: { select: { id: true, name: true } } },
    });
    if (!user || user.role !== 'engineer') return;
    if (!user.outletId || !user.outlet) {
      throw new BadRequestException('工程师必须绑定网点后才能创建个人仓');
    }

    const existing = await this.prisma.warehouse.findFirst({
      where: { type: 'ENGINEER_WAREHOUSE', ownerEngineerId: user.id },
    });

    const data = {
      name: `${user.name}个人仓`,
      outletId: user.outletId,
      outletName: user.outlet.name,
      ownerEngineerName: user.name,
      ownerOutletIdSnapshot: user.outletId,
      status: user.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED',
    };

    if (existing) {
      await this.prisma.warehouse.update({ where: { id: existing.id }, data });
      return;
    }

    await this.prisma.warehouse.create({
      data: {
        warehouseNo: `WH-ENG-${String(user.id).padStart(4, '0')}`,
        type: 'ENGINEER_WAREHOUSE',
        ownerEngineerId: user.id,
        ...data,
      },
    });
  }

  async findAll(params: { keyword?: string; role?: string; status?: string; outletId?: number; page?: number; pageSize?: number }) {
    const { keyword, role, status, outletId, page = 1, pageSize = 20 } = params;
    const where: any = {};
    if (outletId !== undefined) where.outletId = outletId;
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }
    if (role) where.role = role;
    where.status = status || 'ACTIVE';
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { outlet: { select: { id: true, name: true } } } }),
      this.prisma.user.count({ where }),
    ]);
    return { list: list.map(({ password, outlet, ...u }) => ({ ...u, outletId: u.outletId, outletName: outlet?.name || null })), total, page, pageSize };
  }

  async create(data: { username: string; password: string; name: string; phone: string; role: string; outletId?: number }) {
    const existing = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (existing) {
      // 如果用户已存在但被禁用，则重新激活
      if (existing.status === 'DISABLED') {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await this.prisma.user.update({
          where: { username: data.username },
          data: { ...data, password: hashedPassword, status: 'ACTIVE' },
        });
        // 重新激活时也确保角色绑定存在
        const role = await this.prisma.role.findUnique({ where: { key: data.role } });
        if (role) {
          await this.prisma.userRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: role.id } },
            create: { userId: user.id, roleId: role.id },
            update: {},
          });
        }
        await this.ensureEngineerWarehouse(user.id);
        const { password, ...result } = user;
        return result;
      }
      throw new ConflictException('用户名已存在');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({ data: { ...data, password: hashedPassword } });

    // 创建用户角色绑定，继承角色权限
    const role = await this.prisma.role.findUnique({ where: { key: data.role } });
    if (role) {
      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
      });
    }

    await this.ensureEngineerWarehouse(user.id);
    const { password, ...result } = user;
    return result;
  }

  async update(id: number, data: Partial<{ name: string; phone: string; role: string; outletId: number; status: string; password: string }>) {
    const updateData: any = { ...data };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    const user = await this.prisma.user.update({ where: { id }, data: updateData });
    await this.ensureEngineerWarehouse(user.id);
    const { password, ...result } = user;
    return result;
  }

  async toggleStatus(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
    });
    await this.ensureEngineerWarehouse(updated.id);
    const { password, ...result } = updated;
    return result;
  }
}

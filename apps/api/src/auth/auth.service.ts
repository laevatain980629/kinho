import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string, meta?: { ip?: string; userAgent?: string; platform?: string }) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('用户名或密码错误');

    // 检查账号状态
    if (user.status !== 'ACTIVE') throw new ForbiddenException('账号已被禁用，请联系管理员');

    // 检查账号锁定
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(`账号已锁定，请 ${remainMinutes} 分钟后再试`);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // 增加失败计数
      const newCount = user.failedLoginCount + 1;
      const updateData: any = { failedLoginCount: newCount };

      if (newCount >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        updateData.failedLoginCount = 0;
      }

      await this.prisma.user.update({ where: { id: user.id }, data: updateData });
      await this.writeLoginAudit(user.id, username, false, meta);

      if (newCount >= MAX_FAILED_ATTEMPTS) {
        throw new ForbiddenException(`连续失败 ${MAX_FAILED_ATTEMPTS} 次，账号已锁定 ${LOCKOUT_MINUTES} 分钟`);
      }
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 登录成功，重置失败计数
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await this.writeLoginAudit(user.id, username, true, meta);

    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      user: { id: user.id, username: user.username, name: user.name, role: user.role, outletId: user.outletId },
      mustChangePwd: user.mustChangePwd,
    };
  }

  private async writeLoginAudit(userId: number, username: string, success: boolean, meta?: { ip?: string; userAgent?: string; platform?: string }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
          module: 'auth',
          targetId: userId,
          targetName: username,
          detail: success ? '用户登录成功' : '用户登录失败',
          ip: meta?.ip || '127.0.0.1',
          userAgent: (meta?.userAgent || '').substring(0, 500),
          platform: meta?.platform || 'unknown',
        },
      });
    } catch {
      // 登录不能因为审计写入失败而中断。
    }
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new UnauthorizedException('原密码错误');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePwd: false, pwdResetAt: new Date() },
    });

    return { message: '密码修改成功' };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    const { password, ...result } = user;
    return result;
  }

  async getPermissions(userId: number, roleKey: string) {
    if (roleKey === 'admin') {
      const allPerms = await this.prisma.permission.findMany({
        where: { status: 'ACTIVE' },
        select: { key: true, name: true, type: true },
      });
      return { role: roleKey, permissions: allPerms.map(p => p.key), permissionDetails: allPerms };
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: { select: { key: true, name: true, type: true } } },
            },
          },
        },
      },
    });

    const permMap = new Map<string, { key: string; name: string; type: string }>();
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        if (rp.permission) permMap.set(rp.permission.key, rp.permission);
      }
    }

    const permissionDetails = Array.from(permMap.values());
    return {
      role: roleKey,
      permissions: permissionDetails.map(p => p.key),
      permissionDetails,
    };
  }

  async getRolePermissions() {
    const [roles, permissions] = await Promise.all([
      this.prisma.role.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { id: 'asc' },
        include: {
          rolePermissions: {
            include: {
              permission: {
                select: { key: true, name: true, type: true, module: true },
              },
            },
          },
        },
      }),
      this.prisma.permission.findMany({
        where: { status: 'ACTIVE' },
        orderBy: [{ module: 'asc' }, { key: 'asc' }],
        select: { key: true, name: true, type: true, module: true },
      }),
    ]);

    return {
      roles: roles.map((role) => {
        const permissionDetails = role.rolePermissions
          .map((rp) => rp.permission)
          .filter(Boolean);
        return {
          key: role.key,
          name: role.name,
          description: role.description,
          isLocked: role.isLocked,
          permissions: permissionDetails.map((p) => p.key),
          permissionDetails,
        };
      }),
      permissions,
    };
  }
}

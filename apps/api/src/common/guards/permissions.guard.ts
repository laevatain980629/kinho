import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

interface CachedPermissions {
  keys: Set<string>;
  expiresAt: number;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private cache = new Map<number, CachedPermissions>();
  private readonly TTL_MS = 5 * 60 * 1000;

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let user = request.user;

    // Fallback: extract user from JWT if Passport hasn't set it
    if (!user) {
      const auth = request.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) {
        try {
          const payload: any = this.jwtService.verify(auth.slice(7));
          const userId = Number(payload.sub);
          if (!Number.isInteger(userId)) return false;
          const dbUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, role: true, status: true },
          });
          if (!dbUser || dbUser.status !== 'ACTIVE') return false;
          user = { sub: dbUser.id, username: dbUser.username, role: dbUser.role };
        } catch { return false; }
      } else {
        return false;
      }
    }

    if (user.role === 'admin') return true;

    const cached = this.cache.get(user.sub);
    let permKeys: Set<string>;

    if (cached && cached.expiresAt > Date.now()) {
      permKeys = cached.keys;
    } else {
      const userPermissions = await this.prisma.rolePermission.findMany({
        where: {
          role: {
            userRoles: { some: { userId: user.sub } },
            status: 'ACTIVE',
          },
          permission: { status: 'ACTIVE' },
        },
        select: { permission: { select: { key: true } } },
      });

      permKeys = new Set(userPermissions.map((rp) => rp.permission.key));

      this.cache.set(user.sub, {
        keys: permKeys,
        expiresAt: Date.now() + this.TTL_MS,
      });
    }

    return requiredPermissions.some((p) => permKeys.has(p));
  }
}

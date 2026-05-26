import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    const request = context.switchToHttp().getRequest();
    let user = request.user;

    // Fallback: extract user from JWT if Passport hasn't set it
    if (!user) {
      const auth = request.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) {
        try {
          user = this.jwtService.verify(auth.slice(7));
        } catch { return false; }
      }
    }

    if (!user) return false;
    return requiredRoles.includes(user.role);
  }
}

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip, headers } = request;
    const platform = (request as any).platform || headers['x-platform'] || 'unknown';
    const userAgent = headers['user-agent'] || '';

    if (url.includes('/auth/login')) return next.handle();
    return next.handle().pipe(
      tap(() => {
        if (['POST', 'PATCH', 'DELETE'].includes(method) && user) {
          this.prisma.auditLog.create({
            data: {
              userId: user.sub,
              action: method === 'POST' ? 'CREATE' : method === 'PATCH' ? 'UPDATE' : 'DELETE',
              module: url.split('/')[2] || 'unknown',
              detail: JSON.stringify(body).substring(0, 500),
              ip: ip || '127.0.0.1',
              userAgent: userAgent.substring(0, 500),
              platform,
            },
          }).catch(() => {});
        }
      }),
    );
  }
}

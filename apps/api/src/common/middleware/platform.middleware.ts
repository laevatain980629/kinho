import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class PlatformMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const platform = req.headers?.['x-platform'] || 'unknown';
    req.platform = platform;
    next();
  }
}

import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Request() req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.authService.login(body.username, body.password, {
      ip: req.ip,
      userAgent: String(req.headers['user-agent'] || ''),
      platform: String(req.headers['x-platform'] || 'pc'),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: { user: { sub: number } }) {
    return this.authService.getProfile(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/permissions')
  async getMyPermissions(@Request() req: { user: { sub: number; role: string } }) {
    return this.authService.getPermissions(req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Permissions('system:role_manage')
  @Get('roles/permissions')
  async getRolePermissions() {
    return this.authService.getRolePermissions();
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Request() req: { user: { sub: number } },
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(req.user.sub, body.oldPassword, body.newPassword);
  }
}

import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Req() req: any) {
    const userId = req.user.sub;
    return this.notificationsService.findByUser(userId);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const userId = req.user.sub;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    await this.notificationsService.markRead(+id, req.user.sub);
    return { success: true };
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    await this.notificationsService.markAllRead(req.user.sub);
    return { success: true };
  }
}

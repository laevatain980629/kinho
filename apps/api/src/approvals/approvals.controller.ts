import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PrismaService } from '../prisma.service';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(
    private approvalsService: ApprovalsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @Permissions('work_order:view')
  async findAll(@Query() query: { type?: string; status?: string; approverId?: string; page?: string; pageSize?: string }) {
    return this.approvalsService.findAll({
      ...query,
      approverId: query.approverId ? +query.approverId : undefined,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Post(':id/approve')
  @Permissions('work_order:approve_return')
  async approve(@Param('id') id: string, @Request() req: { user: { sub: number } }) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    const approverName = user?.name || user?.username || 'unknown';
    return this.approvalsService.approve(+id, req.user.sub, approverName);
  }

  @Post(':id/reject')
  @Permissions('work_order:approve_return')
  async reject(
    @Param('id') id: string,
    @Body() body: { rejectReason: string },
    @Request() req: { user: { sub: number } },
  ) {
    return this.approvalsService.reject(+id, req.user.sub, body.rejectReason);
  }
}

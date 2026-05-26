import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EscalationsService } from './escalations.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('escalations')
@UseGuards(JwtAuthGuard)
export class EscalationsController {
  constructor(private readonly escalationsService: EscalationsService) {}

  @Get()
  @Permissions('work_order:view')
  async findAll(
    @Query() query: { status?: string; workOrderId?: string; page?: string; pageSize?: string },
  ) {
    return this.escalationsService.findAll({
      status: query.status,
      workOrderId: query.workOrderId ? +query.workOrderId : undefined,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Get(':id')
  @Permissions('work_order:view')
  async findOne(@Param('id') id: string) {
    return this.escalationsService.findById(+id);
  }

  @Post()
  @Permissions('work_order:escalate')
  async create(
    @Body() body: CreateEscalationDto,
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.escalationsService.create({
      ...body,
      applicantId: req.user.sub,
      applicantName: req.user.username,
      applicantRole: req.user.role,
    });
  }

  @Post(':id/approve')
  @Permissions('work_order:approve_escalate')
  async approve(
    @Param('id') id: string,
    @Request() req: { user: { sub: number } },
  ) {
    return this.escalationsService.approveBySupervisor(+id, req.user.sub);
  }

  @Post(':id/reject')
  @Permissions('work_order:approve_escalate')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: { user: { sub: number } },
  ) {
    return this.escalationsService.reject(+id, req.user.sub, body.reason);
  }

  @Post(':id/accept')
  @Permissions('work_order:chief_handle')
  async accept(
    @Param('id') id: string,
    @Request() req: { user: { sub: number } },
  ) {
    return this.escalationsService.acceptByChief(+id, req.user.sub);
  }

  @Post(':id/resolve')
  @Permissions('work_order:chief_handle')
  async resolve(
    @Param('id') id: string,
    @Body() body: { resolution: string; attachments?: { url: string; name: string; size?: number }[] },
    @Request() req: { user: { sub: number } },
  ) {
    return this.escalationsService.resolve(+id, body.resolution, body.attachments, req.user.sub);
  }

  @Post(':id/close')
  @Permissions('work_order:chief_handle')
  async close(@Param('id') id: string) {
    return this.escalationsService.close(+id);
  }
}

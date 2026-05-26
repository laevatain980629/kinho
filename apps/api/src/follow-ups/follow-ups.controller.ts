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
import { FollowUpsService } from './follow-ups.service';
import { CreateFollowUpDto, CompleteFollowUpDto, ExceptionFollowUpDto } from './dto/create-follow-up.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('follow-ups')
@UseGuards(JwtAuthGuard)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Get()
  @Permissions('follow_up:view')
  async findAll(
    @Query() query: {
      status?: string;
      specialistId?: string;
      workOrderId?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    return this.followUpsService.findAll({
      status: query.status,
      specialistId: query.specialistId ? +query.specialistId : undefined,
      workOrderId: query.workOrderId ? +query.workOrderId : undefined,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Get(':id')
  @Permissions('follow_up:view')
  async findOne(@Param('id') id: string) {
    return this.followUpsService.findById(+id);
  }

  @Post()
  @Permissions('follow_up:handle')
  async create(@Body() body: CreateFollowUpDto) {
    return this.followUpsService.create(body);
  }

  @Post(':id/complete')
  @Permissions('follow_up:handle')
  async complete(
    @Param('id') id: string,
    @Body() body: CompleteFollowUpDto,
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.followUpsService.complete(+id, {
      ...body,
      operatorId: req.user.sub,
      operatorName: req.user.username,
      operatorRole: req.user.role,
    });
  }

  @Post(':id/exception')
  @Permissions('follow_up:handle')
  async reportException(@Param('id') id: string, @Body() body: ExceptionFollowUpDto) {
    return this.followUpsService.reportException(+id, body);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('work-orders')
@UseGuards(JwtAuthGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  @Permissions('work_order:view')
  async findAll(
    @Query()
    query: {
      keyword?: string;
      state?: string;
      priority?: string;
      outletId?: string;
      page?: string;
      pageSize?: string;
    },
    @Request() req?: { user: { sub: number; role: string } },
  ) {
    return this.workOrdersService.findAll({
      keyword: query.keyword,
      state: query.state,
      priority: query.priority,
      outletId: query.outletId ? +query.outletId : undefined,
      operatorId: req?.user?.sub,
      operatorRole: req?.user?.role,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Get(':id')
  @Permissions('work_order:view')
  async findOne(
    @Param('id') id: string,
    @Request() req: { user: { sub: number; role: string } },
  ) {
    return this.workOrdersService.findById(+id, undefined, {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  @Get(':id/history')
  @Permissions('work_order:view')
  async getHistory(
    @Param('id') id: string,
    @Request() req: { user: { sub: number; role: string } },
  ) {
    return this.workOrdersService.getHistory(+id, {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  @Post()
  @Permissions('work_order:create')
  async create(
    @Body() body: CreateWorkOrderDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.workOrdersService.create({ ...body, creatorId: req.user.sub });
  }

  @Post(':id/accept')
  @Permissions('work_order:accept')
  async accept(
    @Param('id') id: string,
    @Body() body: { priority?: string; remark?: string; officialTitle?: string },
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.workOrdersService.accept(+id, req.user.sub, req.user.username, req.user.role, body);
  }

  @Post(':id/assign-outlet')
  @Permissions('work_order:assign_outlet')
  async assignOutlet(
    @Param('id') id: string,
    @Body() body: { outletId: number; dispatchReason?: string; expectedArriveAt?: string },
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.workOrdersService.assignOutlet(+id, body.outletId, req.user.sub, req.user.username, req.user.role, body);
  }

  @Post(':id/assign-engineer')
  @Permissions('work_order:assign_engineer')
  async assignEngineer(
    @Param('id') id: string,
    @Body() body: { engineerId: number },
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.workOrdersService.assignEngineer(+id, body.engineerId, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/sign-in')
  @Permissions('work_order:sign_in')
  async signIn(@Param('id') id: string, @Request() req: { user: { sub: number; username: string; role: string } }) {
    return this.workOrdersService.signIn(+id, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/confirm-fault')
  @Permissions('work_order:confirm_fault')
  async confirmFault(
    @Param('id') id: string,
    @Body() body: { faultTypeIds?: number[]; faultDesc?: string; faultCause?: string; faultPhotos?: string[]; suggestedRepairPlan?: string; needQuote?: boolean; needParts?: boolean; needProcurement?: boolean },
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.workOrdersService.confirmFault(+id, body, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/start-repair')
  @Permissions('work_order:start_repair')
  async startRepair(@Param('id') id: string, @Request() req: { user: { sub: number; username: string; role: string } }) {
    return this.workOrdersService.startRepair(+id, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/submit-receipt')
  @Permissions('work_order:submit_receipt')
  async submitReceipt() {
    throw new BadRequestException('请通过 /receipts 提交维修回执');
  }

  @Post(':id/customer-sign')
  @Permissions('work_order:customer_sign')
  async customerSign() {
    throw new BadRequestException('请通过 /receipts/:id/customer-sign 完成客户签字');
  }

  @Post(':id/close')
  @Permissions('work_order:close')
  async close(@Param('id') id: string, @Request() req: { user: { sub: number; username: string; role: string } }) {
    return this.workOrdersService.close(+id, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/cancel')
  @Permissions('work_order:cancel')
  async cancel(@Param('id') id: string, @Request() req: { user: { sub: number; username: string; role: string } }) {
    return this.workOrdersService.cancel(+id, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/hold')
  @Permissions('work_order:close')
  async hold(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.workOrdersService.hold(+id, body.reason, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/unhold')
  @Permissions('work_order:close')
  async unhold(@Param('id') id: string, @Request() req: { user: { sub: number; username: string; role: string } }) {
    return this.workOrdersService.unhold(+id, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/move-to-follow-up')
  @Permissions('work_order:close')
  async moveToFollowUp(@Param('id') id: string, @Request() req: { user: { sub: number; username: string; role: string } }) {
    return this.workOrdersService.moveToFollowUp(+id, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/reopen')
  @Permissions('work_order:close')
  async reopen(@Param('id') id: string, @Request() req: { user: { sub: number; username: string; role: string } }) {
    return this.workOrdersService.reopen(+id, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/return-to-repair')
  @Permissions('work_order:close')
  async returnToRepair(@Param('id') id: string, @Request() req: { user: { sub: number; username: string; role: string } }) {
    return this.workOrdersService.returnToRepair(+id, req.user.sub, req.user.username, req.user.role);
  }

  @Post(':id/confirm-cancel')
  @Permissions('work_order:close')
  async confirmCancel(@Param('id') id: string, @Request() req: { user: { sub: number; username: string; role: string } }) {
    return this.workOrdersService.confirmCancel(+id, req.user.sub, req.user.username, req.user.role);
  }
}

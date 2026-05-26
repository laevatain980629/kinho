import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('procurements')
@UseGuards(JwtAuthGuard)
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get()
  @Permissions('procurement:view')
  async findAll(
    @Query() query: {
      keyword?: string;
      status?: string;
      workOrderId?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    return this.procurementService.findAll({
      keyword: query.keyword,
      status: query.status,
      workOrderId: query.workOrderId ? +query.workOrderId : undefined,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Get(':id')
  @Permissions('procurement:view')
  async findOne(@Param('id') id: string) {
    return this.procurementService.findById(+id);
  }

  @Post()
  @Permissions('procurement:create')
  async create(
    @Body() body: { workOrderId?: number; quoteId?: number; supplierId: number; estimatedCost: number },
  ) {
    return this.procurementService.create(body);
  }

  // 发起询价
  @Post(':id/request-quote')
  @Permissions('procurement:quote')
  async requestQuote(@Param('id') id: string) {
    return this.procurementService.requestQuote(+id);
  }

  // 提交供应商报价
  @Post(':id/submit-quote')
  @Permissions('procurement:quote')
  async submitQuote(@Param('id') id: string) {
    return this.procurementService.submitQuote(+id);
  }

  // 提交审批（从 QUOTED 状态）
  @Post(':id/submit-approval')
  @Permissions('procurement:approve')
  async submitApproval(@Param('id') id: string) {
    return this.procurementService.submitApproval(+id);
  }

  @Post(':id/approve')
  @Permissions('procurement:approve')
  async approve(@Param('id') id: string) {
    return this.procurementService.approve(+id);
  }

  @Post(':id/reject')
  @Permissions('procurement:approve')
  async reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.procurementService.reject(+id, body.reason);
  }

  @Post(':id/order')
  @Permissions('procurement:order')
  async order(@Param('id') id: string) {
    return this.procurementService.order(+id);
  }

  // 部分到货
  @Post(':id/partial-receive')
  @Permissions('procurement:receive')
  async partialReceive(@Param('id') id: string) {
    return this.procurementService.partialReceive(+id);
  }

  @Post(':id/receive')
  @Permissions('procurement:receive')
  async receive(@Param('id') id: string) {
    return this.procurementService.receive(+id);
  }

  @Post(':id/cancel')
  @Permissions('procurement:cancel')
  async cancel(@Param('id') id: string) {
    return this.procurementService.cancel(+id);
  }

  @Delete(':id')
  @Permissions('procurement:edit')
  async remove(@Param('id') id: string) {
    return this.procurementService.delete(+id);
  }

  @Post(':id/resubmit')
  @Permissions('procurement:create')
  async resubmit(@Param('id') id: string) {
    return this.procurementService.resubmit(+id);
  }

  @Patch(':id')
  @Permissions('procurement:edit')
  async update(
    @Param('id') id: string,
    @Body() body: { supplierId?: number; estimatedCost?: number },
  ) {
    return this.procurementService.update(+id, body);
  }
}

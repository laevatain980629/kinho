import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  @Permissions('work_order:submit_receipt')
  async submit(
    @Body() body: CreateReceiptDto,
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.receiptsService.submit(body.workOrderId, {
      ...body,
      createdById: req.user.sub,
      operatorName: req.user.username,
      operatorRole: req.user.role,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.receiptsService.findById(+id);
  }

  @Post(':id/customer-sign')
  @Permissions('work_order:customer_sign')
  async customerSign(
    @Param('id') id: string,
    @Body() body: {
      customerName: string;
      customerPhone?: string;
      signatureUrl: string;
      signedOnDevice?: string;
    },
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.receiptsService.customerSign(+id, {
      ...body,
      signedAt: new Date(),
      operatorId: req.user.sub,
      operatorName: req.user.username,
      operatorRole: req.user.role,
    });
  }

  @Get('work-order/:workOrderId')
  async findByWorkOrder(@Param('workOrderId') workOrderId: string) {
    return this.receiptsService.findByWorkOrder(+workOrderId);
  }
}

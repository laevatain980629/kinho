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
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @Permissions('quote:view')
  async findAll(
    @Query() query: {
      keyword?: string;
      status?: string;
      workOrderId?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    return this.quotesService.findAll({
      keyword: query.keyword,
      status: query.status,
      workOrderId: query.workOrderId ? +query.workOrderId : undefined,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Get(':id')
  @Permissions('quote:view')
  async findOne(@Param('id') id: string) {
    return this.quotesService.findById(+id);
  }

  @Post()
  @Permissions('quote:create')
  async create(@Body() body: CreateQuoteDto) {
    return this.quotesService.create(body);
  }

  @Post(':id/submit')
  @Permissions('quote:submit')
  async submit(@Param('id') id: string) {
    return this.quotesService.submit(+id);
  }

  @Post(':id/approve')
  @Permissions('quote:approve')
  async approve(@Param('id') id: string) {
    return this.quotesService.approve(+id);
  }

  @Post(':id/send-to-customer')
  @Permissions('quote:approve')
  async sendToCustomer(@Param('id') id: string) {
    return this.quotesService.sendToCustomer(+id);
  }

  @Post(':id/reject')
  @Permissions('quote:reject')
  async reject(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.quotesService.reject(+id, body.reason);
  }

  @Post(':id/customer-confirm')
  @Permissions('quote:confirm_customer')
  async customerConfirm(@Param('id') id: string) {
    return this.quotesService.recordCustomerConfirm(+id);
  }

  @Post(':id/customer-reject')
  @Permissions('quote:confirm_customer')
  async customerReject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.quotesService.recordCustomerReject(+id, body.reason);
  }

  @Post(':id/cancel')
  @Permissions('quote:cancel')
  async cancel(@Param('id') id: string) {
    return this.quotesService.cancel(+id);
  }

  @Delete(':id')
  @Permissions('quote:edit')
  async remove(@Param('id') id: string) {
    return this.quotesService.delete(+id);
  }

  @Post(':id/resubmit')
  @Permissions('quote:edit')
  async resubmit(@Param('id') id: string) {
    return this.quotesService.resubmit(+id);
  }

  @Patch(':id')
  @Permissions('quote:edit')
  async update(
    @Param('id') id: string,
    @Body() body: { laborCost?: number; totalAmount?: number; remark?: string; items?: Array<{ id?: number; partId?: number; partNo: string; partName: string; partModel: string; quantity: number; unitPrice: number; amount: number }> },
  ) {
    return this.quotesService.update(+id, body);
  }
}

import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Ip, Headers } from '@nestjs/common';
import { CustomerRequestsService } from './customer-requests.service';
import { CreateCustomerRequestDto } from './dto/create-customer-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('customer-requests')
export class CustomerRequestsController {
  constructor(private readonly customerRequestsService: CustomerRequestsService) {}

  // H5 报修提交（无 JWT）
  @Post()
  async create(
    @Body() body: CreateCustomerRequestDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.customerRequestsService.create(body, ip, userAgent);
  }

  // H5 客户公开查询
  @Get('public')
  async publicQuery(@Query('phone') phone: string) {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return { list: [] };
    const list = await this.customerRequestsService.findByPhone(phone);
    return { list };
  }

  // 后台列表
  @Get()
  @UseGuards(JwtAuthGuard)
  @Permissions('work_order:accept')
  async findAll(@Query() query: { keyword?: string; status?: string; page?: string; pageSize?: string }) {
    return this.customerRequestsService.findAll({
      keyword: query.keyword,
      status: query.status,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('work_order:accept')
  async findOne(@Param('id') id: string) {
    return this.customerRequestsService.findById(+id);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  @Permissions('work_order:accept')
  async accept(
    @Param('id') id: string,
    @Body() body: { customerId?: number; machineId?: number; outletId?: number; officialTitle?: string; remark?: string },
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.customerRequestsService.accept(+id, body, {
      id: req.user.sub,
      name: req.user.username,
      role: req.user.role,
    });
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  @Permissions('work_order:accept')
  async reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.customerRequestsService.reject(+id, body.reason);
  }
}

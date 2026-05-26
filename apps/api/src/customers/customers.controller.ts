import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Permissions('customer:view')
  async findAll(
    @Query() query: { keyword?: string; outletId?: string; status?: string; page?: string; pageSize?: string },
    @Request() req: { user: { sub: number; role: string } },
  ) {
    return this.customersService.findAll({
      keyword: query.keyword,
      outletId: query.outletId ? +query.outletId : undefined,
      status: query.status,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
      operatorId: req.user.sub,
      operatorRole: req.user.role,
    });
  }

  @Get('all')
  @Permissions('customer:view')
  async findAllSimple() { return this.customersService.findAllSimple(); }

  @Get(':id')
  @Permissions('customer:view')
  async findOne(@Param('id') id: string) { return this.customersService.findById(+id); }

  @Delete(':id')
  @Permissions('customer:edit')
  async remove(@Param('id') id: string) { return this.customersService.delete(+id); }

  @Post()
  @Permissions('customer:edit')
  async create(@Body() body: { name: string; contactName?: string; contactPhone: string; outletId: number; address?: string; customerType?: string; remark?: string }) {
    return this.customersService.create(body);
  }

  @Patch(':id')
  @Permissions('customer:edit')
  async update(@Param('id') id: string, @Body() body: { name?: string; contactName?: string; contactPhone?: string; address?: string; customerType?: string; remark?: string }) {
    return this.customersService.update(+id, body);
  }

  @Post(':id/transfer')
  @Permissions('customer:transfer')
  async transfer(@Param('id') id: string, @Body() body: { outletId: number }) {
    return this.customersService.transfer(+id, body.outletId);
  }
}

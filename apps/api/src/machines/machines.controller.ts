import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MachinesService } from './machines.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('machines')
@UseGuards(JwtAuthGuard)
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  @Permissions('machine:view')
  async findAll(@Query() query: { keyword?: string; customerId?: string; outletId?: string; status?: string; page?: string; pageSize?: string }) {
    return this.machinesService.findAll({
      keyword: query.keyword,
      customerId: query.customerId ? +query.customerId : undefined,
      outletId: query.outletId ? +query.outletId : undefined,
      status: query.status,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Get(':id')
  @Permissions('machine:view')
  async findOne(@Param('id') id: string) {
    return this.machinesService.findById(+id);
  }

  @Post()
  @Permissions('machine:edit')
  async create(@Body() body: { serialNo: string; machineCode?: string; brand?: string; model: string; type?: string; customerId: number; outletId?: number; currentHours?: number; purchaseDate?: string; warrantyStartDate?: string; warrantyEndDate?: string; warrantyExpiry?: string; warrantyMonths?: number; warrantyPolicy?: string; warrantyRemark?: string; status?: string }) {
    return this.machinesService.create(body);
  }

  @Patch(':id')
  @Permissions('machine:edit')
  async update(@Param('id') id: string, @Body() body: { serialNo?: string; machineCode?: string; brand?: string; model?: string; type?: string; customerId?: number; outletId?: number; currentHours?: number; purchaseDate?: string; warrantyStartDate?: string; warrantyEndDate?: string; warrantyExpiry?: string; warrantyMonths?: number; warrantyPolicy?: string; warrantyRemark?: string; status?: string }) {
    return this.machinesService.update(+id, body);
  }

  @Delete(':id')
  @Permissions('machine:edit')
  async remove(@Param('id') id: string) {
    return this.machinesService.delete(+id);
  }

  @Post(':id/qrcode')
  @Permissions('machine:qrcode')
  async generateQrCode(@Param('id') id: string) {
    return this.machinesService.generateQrCode(+id);
  }
}

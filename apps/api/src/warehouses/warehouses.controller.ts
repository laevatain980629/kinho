import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('warehouses')
@UseGuards(JwtAuthGuard)
export class WarehousesController {
  constructor(private warehousesService: WarehousesService) {}

  @Get()
  @Permissions('warehouse:view')
  async findAll(
    @Query() query: { keyword?: string; type?: string; status?: string; page?: string; pageSize?: string },
    @Request() req: { user: { sub: number; role: string } },
  ) {
    return this.warehousesService.findAll({
      ...query,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    }, req.user);
  }

  @Get('all')
  @Permissions('warehouse:view')
  async findAllSimple(@Request() req: { user: { sub: number; role: string } }) {
    return this.warehousesService.findAllSimple(req.user);
  }

  @Get(':id')
  @Permissions('warehouse:view')
  async findById(@Param('id') id: string, @Request() req: { user: { sub: number; role: string } }) {
    return this.warehousesService.findById(+id, req.user);
  }

  @Post()
  @Permissions('warehouse:stock_manage')
  async create(@Body() body: { name: string; type: string; outletId?: number; outletName?: string; ownerEngineerId?: number; ownerEngineerName?: string; k3WarehouseCode?: string }) {
    return this.warehousesService.create(body);
  }

  @Patch(':id')
  @Permissions('warehouse:stock_manage')
  async update(@Param('id') id: string, @Body() body: Partial<{ name: string; type: string; outletId: number; outletName: string; ownerEngineerId: number; ownerEngineerName: string; k3WarehouseCode: string; status: string }>) {
    return this.warehousesService.update(+id, body);
  }

  @Delete(':id')
  @Permissions('warehouse:edit')
  async remove(@Param('id') id: string) { return this.warehousesService.delete(+id); }

  @Post(':id/toggle-status')
  @Permissions('warehouse:edit')
  async toggleStatus(@Param('id') id: string) { return this.warehousesService.toggleStatus(+id); }
}

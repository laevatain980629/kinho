import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OutletsService } from './outlets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('outlets')
@UseGuards(JwtAuthGuard)
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get()
  @Permissions('outlet:view')
  async findAll(@Query() query: { keyword?: string; status?: string; page?: string; pageSize?: string }) {
    return this.outletsService.findAll({
      keyword: query.keyword,
      status: query.status,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Get('all')
  @Permissions('outlet:view', 'work_order:assign_outlet')
  async findAllSimple() {
    return this.outletsService.findAllSimple();
  }

  @Get(':id')
  @Permissions('outlet:view')
  async findOne(@Param('id') id: string) {
    return this.outletsService.findById(+id);
  }

  @Post()
  @Permissions('outlet:edit')
  async create(@Body() body: { name: string; code?: string; address?: string; phone?: string; manager?: string }) {
    return this.outletsService.create(body);
  }

  @Patch(':id')
  @Permissions('outlet:edit')
  async update(@Param('id') id: string, @Body() body: { name?: string; address?: string; phone?: string; manager?: string }) {
    return this.outletsService.update(+id, body);
  }

  @Post(':id/toggle-status')
  @Permissions('outlet:edit')
  async toggleStatus(@Param('id') id: string) {
    return this.outletsService.toggleStatus(+id);
  }

  @Delete(':id')
  @Permissions('outlet:edit')
  async remove(@Param('id') id: string) {
    return this.outletsService.remove(+id);
  }
}

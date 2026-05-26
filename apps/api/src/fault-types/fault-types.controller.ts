import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('fault-types')
@UseGuards(JwtAuthGuard)
export class FaultTypesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Permissions('parts:view')
  async findAll() {
    const list = await this.prisma.faultType.findMany({ orderBy: { sortOrder: 'asc' } });
    return { list: list.map(ft => this.map(ft)), total: list.length };
  }

  @Get(':id')
  @Permissions('parts:view')
  async findOne(@Param('id') id: string) { return this.map(await this.prisma.faultType.findUniqueOrThrow({ where: { id: +id } })); }

  @Post()
  @Permissions('parts:edit')
  async create(@Body() data: any) {
    const code = data.code || `FT-${Date.now()}`;
    return this.map(await this.prisma.faultType.create({ data: { name: data.name, code, sortOrder: data.sortOrder || 0, level: data.level || 1, parentId: data.parentId || null, status: data.enabled === false ? 'INACTIVE' : 'ACTIVE' } }));
  }

  @Patch(':id')
  @Permissions('parts:edit')
  async update(@Param('id') id: string, @Body() data: any) {
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder;
    if (data.enabled !== undefined) update.status = data.enabled ? 'ACTIVE' : 'INACTIVE';
    return this.map(await this.prisma.faultType.update({ where: { id: +id }, data: update }));
  }

  @Delete(':id')
  @Permissions('parts:edit')
  async remove(@Param('id') id: string) {
    await this.prisma.faultType.update({ where: { id: +id }, data: { status: 'INACTIVE' } });
    return { deleted: true };
  }

  @Patch(':id/toggle-enabled')
  @Permissions('parts:edit')
  async toggle(@Param('id') id: string) {
    const ft = await this.prisma.faultType.findUniqueOrThrow({ where: { id: +id } });
    return this.map(await this.prisma.faultType.update({ where: { id: +id }, data: { status: ft.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } }));
  }

  private map(ft: any) {
    return { ...ft, enabled: ft.status === 'ACTIVE' };
  }
}

import { BadRequestException, Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('parts')
@UseGuards(JwtAuthGuard)
export class PartsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Permissions('parts:view')
  async findAll(@Query() query: any) {
    const page = Number(query.page) || 1; const pageSize = Number(query.pageSize) || 20;
    const where: any = {};
    if (query.keyword) where.OR = [{ partNo: { contains: query.keyword } }, { name: { contains: query.keyword } }, { spec: { contains: query.keyword } }];
    const [list, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.inventoryItem.count({ where }),
    ]);
    return { list: await this.mapMany(list), total, page, pageSize };
  }

  @Get('all')
  @Permissions('parts:view')
  async getAll() { return this.mapMany(await this.prisma.inventoryItem.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } })); }

  @Get('search')
  @Permissions('parts:view')
  async search(@Query('keyword') kw: string) {
    return this.mapMany(await this.prisma.inventoryItem.findMany({
      where: { status: 'ACTIVE', OR: [{ partNo: { contains: kw } }, { name: { contains: kw } }, { spec: { contains: kw } }] }, take: 20,
    }));
  }

  @Get(':id')
  @Permissions('parts:view')
  async findOne(@Param('id') id: string) { return this.mapOne(await this.prisma.inventoryItem.findUniqueOrThrow({ where: { id: +id } })); }

  @Post()
  @Permissions('parts:edit')
  async create(@Body() data: any) { return this.mapOne(await this.prisma.inventoryItem.create({ data: this.input(data) })); }

  @Patch(':id')
  @Permissions('parts:edit')
  async update(@Param('id') id: string, @Body() data: any) { return this.mapOne(await this.prisma.inventoryItem.update({ where: { id: +id }, data: this.input(data) })); }

  @Delete(':id')
  @Permissions('parts:edit')
  async remove(@Param('id') id: string) { await this.prisma.inventoryItem.update({ where: { id: +id }, data: { status: 'INACTIVE' } }); return { deleted: true }; }

  @Patch(':id/toggle-enabled')
  @Permissions('parts:edit')
  async toggle(@Param('id') id: string) {
    const item = await this.prisma.inventoryItem.findUniqueOrThrow({ where: { id: +id } });
    return this.mapOne(await this.prisma.inventoryItem.update({ where: { id: +id }, data: { status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } }));
  }

  @Post('import')
  @Permissions('parts:edit')
  async importParts(@Body() body: { items?: any[] } | any[]) {
    const rows = Array.isArray(body) ? body : body?.items;
    if (!Array.isArray(rows)) {
      throw new BadRequestException('导入数据必须是数组或 { items: [] }');
    }
    if (rows.length === 0) {
      throw new BadRequestException('导入数据不能为空');
    }

    let successCount = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (const [index, row] of rows.entries()) {
      try {
        const data = this.input(row);
        if (!data.partNo) {
          throw new BadRequestException('物料号不能为空');
        }
        if (!data.name) {
          throw new BadRequestException('配件名称不能为空');
        }

        await this.prisma.inventoryItem.upsert({
          where: { partNo: data.partNo },
          update: data,
          create: data,
        });
        successCount++;
      } catch (error) {
        errors.push({
          index,
          message: error instanceof Error ? error.message : '导入失败',
        });
      }
    }

    return {
      success: errors.length === 0,
      count: successCount,
      failedCount: errors.length,
      errors,
    };
  }

  // Map InventoryItem → Part (frontend type)
  private async mapMany(items: any[]) {
    const stockByPartId = await this.getStockByPartId(items.map((item) => item.id));
    return items.map((item) => this.mapShape(item, stockByPartId.get(item.id) ?? 0));
  }

  private async mapOne(item: any) {
    const stockByPartId = await this.getStockByPartId([item.id]);
    return this.mapShape(item, stockByPartId.get(item.id) ?? 0);
  }

  private mapShape(item: any, stock: number) {
    return {
      id: item.id, materialNo: item.partNo, name: item.name, model: item.spec || '',
      unitPrice: item.unitPrice === null || item.unitPrice === undefined ? null : Number(item.unitPrice),
      stock,
      unit: item.unit,
      categoryId: null,
      categoryName: item.category || '',
      enabled: item.status === 'ACTIVE', createdAt: item.createdAt, updatedAt: item.updatedAt,
    };
  }

  private async getStockByPartId(partIds: number[]) {
    if (partIds.length === 0) return new Map<number, number>();
    const grouped = await this.prisma.inventoryBalance.groupBy({
      by: ['partId'],
      where: { partId: { in: partIds } },
      _sum: { quantityAvailable: true },
    });
    return new Map(grouped.map((row) => [row.partId, row._sum.quantityAvailable ?? 0]));
  }

  // Map Part form → InventoryItem fields
  private input(data: any): any {
    const r: any = {};
    if (data.materialNo !== undefined || data.partNo !== undefined) r.partNo = data.materialNo ?? data.partNo;
    if (data.name !== undefined) r.name = data.name;
    if (data.model !== undefined || data.spec !== undefined) r.spec = data.model ?? data.spec;
    if (data.unit !== undefined) r.unit = data.unit;
    if (data.unitPrice !== undefined && data.unitPrice !== null && data.unitPrice !== '') r.unitPrice = data.unitPrice;
    if (data.categoryName !== undefined || data.category !== undefined) r.category = data.categoryName ?? data.category;
    if (data.enabled !== undefined) r.status = data.enabled ? 'ACTIVE' : 'INACTIVE';
    if (data.status !== undefined) r.status = data.status;
    return r;
  }
}

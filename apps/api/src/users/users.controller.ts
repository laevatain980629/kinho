import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('engineers')
  @Permissions('work_order:assign_engineer', 'system:user_manage')
  async findEngineers(@Query() query: { keyword?: string; outletId?: string; status?: string; page?: string; pageSize?: string }) {
    return this.usersService.findAll({
      keyword: query.keyword,
      role: 'engineer',
      status: query.status,
      outletId: query.outletId ? +query.outletId : undefined,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Get()
  @Permissions('system:user_manage')
  async findAll(@Query() query: { keyword?: string; role?: string; status?: string; outletId?: string; page?: string; pageSize?: string }) {
    return this.usersService.findAll({
      ...query,
      outletId: query.outletId ? +query.outletId : undefined,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Post()
  @Roles('admin')
  async create(@Body() body: { username: string; password: string; name: string; phone: string; role: string; outletId?: number }) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() body: Partial<{ name: string; phone: string; role: string; outletId: number; status: string; password: string }>) {
    return this.usersService.update(+id, body);
  }

  @Post(':id/toggle-status')
  @Roles('admin')
  async toggleStatus(@Param('id') id: string) { return this.usersService.toggleStatus(+id); }
}

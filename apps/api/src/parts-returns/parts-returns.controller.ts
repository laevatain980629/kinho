import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PartsReturnsService } from './parts-returns.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PrismaService } from '../prisma.service';

@Controller('parts-returns')
@UseGuards(JwtAuthGuard)
export class PartsReturnsController {
  constructor(
    private readonly partsReturnsService: PartsReturnsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Permissions('parts:view')
  async findAll(
    @Query()
    query: {
      keyword?: string;
      reason?: string;
      status?: string;
      workOrderId?: string;
      page?: string;
      pageSize?: string;
    },
    @Request() req?: { user: { sub: number; role: string } },
  ) {
    return this.partsReturnsService.findAll({
      keyword: query.keyword,
      reason: query.reason,
      status: query.status,
      workOrderId: query.workOrderId ? +query.workOrderId : undefined,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
      userId: req?.user?.sub,
      userRole: req?.user?.role,
    });
  }

  @Get(':id')
  @Permissions('parts:view')
  async findOne(@Param('id') id: string, @Request() req: { user: { sub: number; role: string } }) {
    return this.partsReturnsService.findById(+id, req.user);
  }

  @Post()
  @Permissions('parts:return_apply')
  async create(
    @Body()
    body: {
      workOrderId?: number;
      fromWarehouseId: number;
      toWarehouseId: number;
      reason: string;
      qualityResult?: string;
      items: Array<{
        partId: number;
        partNo?: string;
        partName?: string;
        partModel?: string;
        quantity: number;
        qualityResult?: string;
      }>;
    },
    @Request() req: { user: { sub: number; role: string } },
  ) {
    return this.partsReturnsService.create({
      ...body,
      operatorId: req.user.sub,
      operatorRole: req.user.role,
    });
  }

  @Post(':id/confirm')
  @Permissions('parts:return_confirm')
  async confirm(
    @Param('id') id: string,
    @Body() body: { items?: Array<{ partId?: number; quantity?: number; qualityResult?: string }> },
    @Request() req: { user: { sub: number; username: string } },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    return this.partsReturnsService.confirm(
      +id,
      req.user.sub,
      user?.name || req.user.username,
      body.items,
      req.user,
    );
  }

  @Post(':id/reject')
  @Permissions('parts:return_confirm')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: { user: { sub: number; role: string } },
  ) {
    return this.partsReturnsService.reject(+id, body.reason, req.user);
  }
}

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
import { PartsRequestsService } from './parts-requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PrismaService } from '../prisma.service';

@Controller('parts-requests')
@UseGuards(JwtAuthGuard)
export class PartsRequestsController {
  constructor(
    private readonly partsRequestsService: PartsRequestsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Permissions('parts:view')
  async findAll(
    @Query()
    query: {
      keyword?: string;
      type?: string;
      status?: string;
      workOrderId?: string;
      page?: string;
      pageSize?: string;
    },
    @Request() req?: { user: { sub: number; role: string } },
  ) {
    return this.partsRequestsService.findAll({
      keyword: query.keyword,
      type: query.type,
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
    return this.partsRequestsService.findById(+id, req.user);
  }

  @Post()
  @Permissions('parts:apply', 'parts:approve')
  async create(
    @Body()
    body: {
      type: string;
      fromWarehouseId?: number;
      toWarehouseId?: number;
      workOrderId?: number;
      items: Array<{
        partId: number;
        partNo: string;
        partName: string;
        partModel: string;
        quantity: number;
      }>;
    },
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    return this.partsRequestsService.create({
      ...body,
      operatorId: req.user.sub,
      operatorName: req.user.username,
      operatorRole: req.user.role,
    });
  }

  @Post(':id/approve')
  @Permissions('parts:approve')
  async approve(
    @Param('id') id: string,
    @Request() req: { user: { sub: number; username: string } },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    return this.partsRequestsService.approve(+id, req.user.sub, user?.name || req.user.username, req.user);
  }

  @Post(':id/reject')
  @Permissions('parts:approve')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: { user: { sub: number; role: string } },
  ) {
    return this.partsRequestsService.reject(+id, body.reason, req.user);
  }

  @Post(':id/ship')
  @Permissions('parts:ship')
  async ship(@Param('id') id: string, @Request() req: { user: { sub: number; username: string; role: string } }) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    return this.partsRequestsService.ship(+id, { ...req.user, username: user?.name || req.user.username });
  }

  @Post(':id/receive')
  @Permissions('parts:receive')
  async receive(
    @Param('id') id: string,
    @Request() req: { user: { sub: number; username: string } },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    return this.partsRequestsService.receive(+id, req.user.sub, user?.name || req.user.username, req.user);
  }

  @Post(':id/cancel')
  @Permissions('parts:approve')
  async cancel(
    @Param('id') id: string,
    @Request() req: { user: { sub: number; username: string; role: string } },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    return this.partsRequestsService.cancel(+id, req.user.sub, user?.name || req.user.username, req.user);
  }

  @Post(':id/resubmit')
  @Permissions('parts:approve')
  async resubmit(
    @Param('id') id: string,
    @Body()
    body: {
      fromWarehouseId: number;
      toWarehouseId: number;
      items: Array<{
        partId: number;
        partNo: string;
        partName: string;
        partModel: string;
        quantity: number;
      }>;
    },
    @Request() req: { user: { sub: number; role: string } },
  ) {
    return this.partsRequestsService.resubmit(+id, body, req.user);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('balances')
  @Permissions('warehouse:view')
  async getBalances(
    @Query() query: { warehouseId?: string; partId?: string; outletId?: string },
    @Request() req: { user: { sub: number; role: string } },
  ) {
    const list = await this.inventoryService.getBalances(
      query.warehouseId ? +query.warehouseId : undefined,
      query.partId ? +query.partId : undefined,
      query.outletId ? +query.outletId : undefined,
      req.user,
    );
    return { list, total: list.length };
  }

  @Get('my')
  @Permissions('warehouse:view')
  async getMyBalances(@Request() req: { user: { sub: number; role: string } }) {
    const list = await this.inventoryService.getMyBalances(req.user.sub, req.user.role);
    return { list, total: list.length };
  }

  @Get('transactions')
  @Permissions('warehouse:view')
  async getTransactions(
    @Query() query: { warehouseId?: string; partId?: string; type?: string; page?: string; pageSize?: string },
    @Request() req: { user: { sub: number; role: string } },
  ) {
    return this.inventoryService.getTransactions(
      query.warehouseId ? +query.warehouseId : undefined,
      query.partId ? +query.partId : undefined,
      query.type,
      query.page ? +query.page : undefined,
      query.pageSize ? +query.pageSize : undefined,
      req.user,
    );
  }

  @Post('reserve')
  @Permissions('warehouse:reservation_manage')
  async reserve(
    @Body()
    body: {
      warehouseId: number;
      partId: number;
      quantity: number;
      sourceType: string;
      sourceId: number;
    },
    @Request() req: { user: { sub: number; username: string } },
  ) {
    return this.inventoryService.reserve(
      body.warehouseId,
      body.partId,
      body.quantity,
      body.sourceType,
      body.sourceId,
      req.user.sub,
      req.user.username,
    );
  }

  @Post('release')
  @Permissions('warehouse:reservation_manage')
  async release(
    @Body()
    body: {
      warehouseId: number;
      partId: number;
      quantity: number;
    },
    @Request() req: { user: { sub: number; username: string } },
  ) {
    return this.inventoryService.release(
      body.warehouseId,
      body.partId,
      body.quantity,
      req.user.sub,
      req.user.username,
    );
  }

  @Post('consume')
  @Permissions('warehouse:stock_manage')
  async consume(
    @Body()
    body: {
      warehouseId: number;
      partId: number;
      quantity: number;
      relatedOrderType: string;
      relatedOrderId: number;
    },
    @Request() req: { user: { sub: number; username: string } },
  ) {
    return this.inventoryService.consume(
      body.warehouseId,
      body.partId,
      body.quantity,
      body.relatedOrderType,
      body.relatedOrderId,
      req.user.sub,
      req.user.username,
    );
  }

  @Post('transfer')
  @Permissions('warehouse:transfer')
  async transfer(
    @Body()
    body: {
      fromWarehouseId: number;
      toWarehouseId: number;
      partId: number;
      quantity: number;
      operatorId?: number;
      operatorName?: string;
    },
    @Request() req: { user: { sub: number; username: string } },
  ) {
    return this.inventoryService.transfer(
      body.fromWarehouseId,
      body.toWarehouseId,
      body.partId,
      body.quantity,
      req.user.sub,
      req.user.username,
    );
  }

  @Post('k3-sync')
  @Permissions('warehouse:k3_sync')
  async syncK3Stock(
    @Body() body: { warehouseId: number; items: Array<{ partId: number; quantity: number }> },
    @Request() req: { user: { sub: number; username: string } },
  ) {
    return this.inventoryService.syncK3Stock(body.warehouseId, body.items || [], req.user.sub, req.user.username);
  }

  @Post('adjust')
  @Permissions('warehouse:stock_manage')
  async adjust(
    @Body() body: { warehouseId: number; partId: number; quantity: number; reason: string },
    @Request() req: { user: { sub: number; username: string } },
  ) {
    return this.inventoryService.adjust(body.warehouseId, body.partId, body.quantity, body.reason, req.user.sub, req.user.username);
  }
}

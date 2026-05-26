import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

export interface ReportQueryFilters {
  dateRange?: string;
  dateStart?: string;
  dateEnd?: string;
  outlet?: string;
  engineer?: string;
  status?: string;
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
@Permissions('report:view')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('work-orders')
  async getWorkOrderReport(@Query() query: ReportQueryFilters) {
    return this.reportsService.getWorkOrderReport(query);
  }

  @Get('quotes')
  async getQuoteReport(@Query() query: ReportQueryFilters) {
    return this.reportsService.getQuoteReport(query);
  }

  @Get('procurement')
  async getProcurementReport(@Query() query: ReportQueryFilters) {
    return this.reportsService.getProcurementReport(query);
  }

  @Get('inventory')
  async getInventoryReport(@Query() query: ReportQueryFilters) {
    return this.reportsService.getInventoryReport(query);
  }

  @Get('parts-flow')
  async getPartsFlowReport(@Query() query: ReportQueryFilters) {
    return this.reportsService.getPartsFlowReport(query);
  }
}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions('system:audit_log')
  async findAll(
    @Query()
    query: {
      userId?: string;
      action?: string;
      module?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    return this.auditLogsService.findAll({
      userId: query.userId ? +query.userId : undefined,
      action: query.action,
      module: query.module,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page ? +query.page : undefined,
      pageSize: query.pageSize ? +query.pageSize : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.auditLogsService.findById(+id);
  }
}

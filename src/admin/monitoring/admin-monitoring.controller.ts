import { Controller, Get, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../../subscriptions/guards/super-admin.guard';
import { AdminMonitoringService } from './admin-monitoring.service';

@Controller('admin/monitoring')
@UseGuards(SuperAdminGuard)
export class AdminMonitoringController {
  constructor(private readonly monitoringService: AdminMonitoringService) {}

  @Get('health')
  getSystemMonitoring() {
    return this.monitoringService.getSystemMonitoring();
  }
}


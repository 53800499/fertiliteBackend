import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../../subscriptions/guards/super-admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin')
@UseGuards(SuperAdminGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('dashboard')
  getDashboard(@Query('period') period?: string) {
    return this.dashboardService.getDashboard(period);
  }

  @Get('analytics')
  getAnalytics(@Query('period') period?: string) {
    return this.dashboardService.getAdvancedAnalytics(period);
  }
}


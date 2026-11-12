import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Notification } from '../../notifications/entities/notification.entity';
import { FedaPayService } from '../../subscriptions/fedapay.service';

@Injectable()
export class AdminMonitoringService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly dataSource: DataSource,
    private readonly fedapayService: FedaPayService,
  ) {}

  async getSystemMonitoring() {
    const dbStart = Date.now();
    let dbHealthy = true;
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      dbHealthy = false;
    }
    const dbLatencyMs = Date.now() - dbStart;
    const mem = process.memoryUsage();
    const notificationsCount = await this.notificationRepo.count();

    return {
      apiStatus: 'operational',
      nodeEnv: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      database: {
        status: dbHealthy ? 'connected' : 'error',
        latencyMs: dbLatencyMs,
      },
      memoryMb: {
        rss: Math.round(mem.rss / 1048576),
        heapUsed: Math.round(mem.heapUsed / 1048576),
        heapTotal: Math.round(mem.heapTotal / 1048576),
      },
      services: {
        fedapayMode: this.fedapayService.isLiveEnvironment() ? 'live' : 'sandbox',
        fedapayConfigured: this.fedapayService.isConfigured(),
        notificationsStored: notificationsCount,
      },
      checkedAt: new Date().toISOString(),
    };
  }
}


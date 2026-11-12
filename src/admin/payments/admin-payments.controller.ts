import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminGuard } from '../../subscriptions/guards/super-admin.guard';
import { extractAdminActor } from '../shared/admin-actor.helper';
import { AdminPaymentsService } from './admin-payments.service';

@Controller('admin/payments')
@UseGuards(SuperAdminGuard)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: AdminPaymentsService) {}

  @Get()
  listPayments(@Query('status') status?: string, @Query('provider') provider?: string) {
    return this.paymentsService.listPayments(status, provider);
  }

  @Post(':id/reconcile')
  reconcilePayment(@Param('id') id: string, @Req() req: any) {
    return this.paymentsService.reconcilePayment(id, extractAdminActor(req));
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="myfertility-paiements.csv"')
  exportPaymentsCsv(@Req() req: any) {
    return this.paymentsService.exportPaymentsCsv(extractAdminActor(req));
  }
}


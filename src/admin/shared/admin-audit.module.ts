import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from '../../super-admin/entities/admin-audit-log.entity';
import {
  ADMIN_AUDIT_LOGGER,
  AdminAuditService,
} from './admin-audit.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AdminAuditLog])],
  providers: [
    AdminAuditService,
    {
      provide: ADMIN_AUDIT_LOGGER,
      useExisting: AdminAuditService,
    },
  ],
  exports: [AdminAuditService, ADMIN_AUDIT_LOGGER, TypeOrmModule],
})
export class AdminAuditModule {}


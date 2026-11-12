import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from '../../super-admin/entities/admin-audit-log.entity';
import type { AdminActor } from './admin-actor.helper';

/** DIP / ISP: Abstraction for immutable admin audit logging. */
export const ADMIN_AUDIT_LOGGER = 'ADMIN_AUDIT_LOGGER';

export interface IAdminAuditLogger {
  log(
    actor: AdminActor,
    module: string,
    action: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, any>,
  ): Promise<void>;
}

@Injectable()
export class AdminAuditService implements IAdminAuditLogger {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  async log(
    actor: AdminActor,
    module: string,
    action: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        actorId: actor.id || null,
        actorEmail: actor.email || 'super_admin',
        actorRole: actor.role || 'super_admin',
        module,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        details: details || null,
        ipAddress: actor.ip || null,
      });
      await this.auditRepo.save(entry);
    } catch {
      // L'audit ne doit pas bloquer la réponse en cas de contention mineure
    }
  }
}


import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettings } from '../../super-admin/entities/platform-settings.entity';
import {
  ADMIN_AUDIT_LOGGER,
  type IAdminAuditLogger,
} from '../shared/admin-audit.service';
import type { AdminActor } from '../shared/admin-actor.helper';

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectRepository(PlatformSettings)
    private readonly settingsRepo: Repository<PlatformSettings>,
    @Inject(ADMIN_AUDIT_LOGGER)
    private readonly auditLogger: IAdminAuditLogger,
  ) {}

  async getPlatformSettings(): Promise<PlatformSettings> {
    let settings = await this.settingsRepo.findOne({ where: { id: 'global' } });
    if (!settings) {
      settings = this.settingsRepo.create({ id: 'global' });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  async updatePlatformSettings(dto: Partial<PlatformSettings>, actor: AdminActor) {
    const settings = await this.getPlatformSettings();
    Object.assign(settings, {
      ...(dto.nomPlateforme !== undefined && { nomPlateforme: dto.nomPlateforme }),
      ...(dto.emailContact !== undefined && { emailContact: dto.emailContact }),
      ...(dto.telephoneSupport !== undefined && { telephoneSupport: dto.telephoneSupport }),
      ...(dto.devise !== undefined && { devise: dto.devise }),
      ...(dto.versionMinAndroid !== undefined && { versionMinAndroid: dto.versionMinAndroid }),
      ...(dto.versionMinIos !== undefined && { versionMinIos: dto.versionMinIos }),
      ...(dto.modeMaintenance !== undefined && { modeMaintenance: dto.modeMaintenance }),
      ...(dto.messageMaintenance !== undefined && { messageMaintenance: dto.messageMaintenance }),
      ...(dto.cguVersion !== undefined && { cguVersion: dto.cguVersion }),
      ...(dto.politiqueVersion !== undefined && { politiqueVersion: dto.politiqueVersion }),
      ...(dto.fournisseurPaiementActif !== undefined && {
        fournisseurPaiementActif: dto.fournisseurPaiementActif,
      }),
    });
    const saved = await this.settingsRepo.save(settings);
    await this.auditLogger.log(
      actor,
      'settings',
      'UPDATE_PLATFORM_SETTINGS',
      'platform_settings',
      'global',
    );
    return saved;
  }
}


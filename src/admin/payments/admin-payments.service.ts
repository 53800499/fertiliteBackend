import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Abonnement,
  StatutAbonnementEnum,
} from '../../subscriptions/entities/abonnement.entity';
import { FedaPayService } from '../../subscriptions/fedapay.service';
import {
  ADMIN_AUDIT_LOGGER,
  type IAdminAuditLogger,
} from '../shared/admin-audit.service';
import type { AdminActor } from '../shared/admin-actor.helper';

@Injectable()
export class AdminPaymentsService {
  constructor(
    @InjectRepository(Abonnement)
    private readonly abonnementRepo: Repository<Abonnement>,
    private readonly fedapayService: FedaPayService,
    @Inject(ADMIN_AUDIT_LOGGER)
    private readonly auditLogger: IAdminAuditLogger,
  ) {}

  async listPayments(status?: string, provider?: string) {
    const qb = this.abonnementRepo
      .createQueryBuilder('a')
      .leftJoin('a.utilisateur', 'u')
      .addSelect(['u.id', 'u.email'])
      .orderBy('a.dateCreation', 'DESC')
      .take(250);

    if (status && status !== 'tous') {
      qb.andWhere('a.statut = :status', { status });
    }
    if (provider && provider !== 'tous') {
      qb.andWhere('a.fournisseur = :provider', { provider });
    }

    const list = await qb.getMany();
    const totalEncaisse = list
      .filter((t) => Number(t.montant) > 0 && t.statut !== StatutAbonnementEnum.ANNULE)
      .reduce((sum, t) => sum + Number(t.montant || 0), 0);

    const byProvider: Record<string, number> = {};
    for (const item of list) {
      const key = item.fournisseur || 'autre';
      byProvider[key] = (byProvider[key] || 0) + Number(item.montant || 0);
    }

    return {
      summary: {
        totalTransactions: list.length,
        totalEncaisse,
        devise: 'XOF',
        byProvider,
      },
      transactions: list.map((t) => ({
        id: t.id,
        utilisateurId: t.utilisateurId,
        utilisateurEmail: t.utilisateur?.email || '—',
        plan: t.plan,
        statut: t.statut,
        montant: Number(t.montant || 0),
        devise: t.devise,
        fournisseur: t.fournisseur,
        referenceTransaction: t.referenceTransaction,
        dateDebut: t.dateDebut,
        dateFin: t.dateFin,
        dateCreation: t.dateCreation,
      })),
    };
  }

  async reconcilePayment(abonnementId: string, actor: AdminActor) {
    const sub = await this.abonnementRepo.findOne({ where: { id: abonnementId } });
    if (!sub) throw new NotFoundException('Transaction introuvable.');
    if (!sub.referenceTransaction) {
      return { reconciled: false, message: 'Aucune référence externe associée.' };
    }
    const verification = await this.fedapayService.verifyTransaction(sub.referenceTransaction);
    await this.auditLogger.log(actor, 'payments', 'RECONCILE_PAYMENT', 'abonnement', abonnementId, {
      reference: sub.referenceTransaction,
      providerStatus: verification.status,
      approved: verification.approved,
    });
    return {
      reconciled: true,
      approved: verification.approved,
      providerStatus: verification.status,
      amount: verification.amount,
    };
  }

  async exportPaymentsCsv(actor: AdminActor): Promise<string> {
    const { transactions } = await this.listPayments();
    await this.auditLogger.log(actor, 'payments', 'EXPORT_PAYMENTS_CSV', 'export', undefined, {
      rows: transactions.length,
    });
    const header = 'ID,Email,Plan,Statut,Montant,Devise,Fournisseur,Reference,DateCreation\n';
    const rows = transactions
      .map((t) =>
        [
          t.id,
          t.utilisateurEmail,
          t.plan,
          t.statut,
          t.montant,
          t.devise,
          t.fournisseur,
          t.referenceTransaction || '',
          new Date(t.dateCreation).toISOString(),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    return header + rows;
  }
}


import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlanAbonnementEnum } from './entities/abonnement.entity';
import { Utilisateur } from '../users/entities/utilisateur.entity';

export interface FedaPayTransactionResult {
  transactionId: string;
  token?: string;
  checkoutUrl: string;
  amount: number;
  devise: string;
  plan: PlanAbonnementEnum;
  mode: 'fedapay_live' | 'fedapay_sandbox' | 'simulation';
  message: string;
}

export interface FedaPayVerificationResult {
  approved: boolean;
  transactionId: string;
  status: string;
  amount?: number;
  raw?: any;
}

@Injectable()
export class FedaPayService {
  private readonly logger = new Logger(FedaPayService.name);

  constructor(private readonly configService: ConfigService) {}

  private get secretKey(): string | undefined {
    return (
      this.configService.get<string>('FEDAPAY_SECRET_KEY') ||
      process.env.FEDAPAY_SECRET_KEY
    );
  }

  private get environment(): 'sandbox' | 'live' {
    const env = (
      this.configService.get<string>('FEDAPAY_ENVIRONMENT') ||
      process.env.FEDAPAY_ENVIRONMENT ||
      'sandbox'
    ).toLowerCase();
    return env === 'live' ? 'live' : 'sandbox';
  }

  private get apiBaseUrl(): string {
    return this.environment === 'live'
      ? 'https://api.fedapay.com/v1'
      : 'https://sandbox-api.fedapay.com/v1';
  }

  private get defaultCallbackUrl(): string {
    return (
      this.configService.get<string>('FEDAPAY_CALLBACK_URL') ||
      process.env.FEDAPAY_CALLBACK_URL ||
      'https://fertilitebackend.onrender.com/api/v1/subscriptions/payment/fedapay-webhook'
    );
  }

  public isLiveEnvironment(): boolean {
    return this.environment === 'live';
  }

  public isConfigured(): boolean {
    const key = this.secretKey;
    return !!key && key.trim().length > 0 && !key.includes('votre_cle');
  }

  /**
   * Initialise une transaction de paiement FedaPay (MTN MoMo, Moov Money, Celtiis Cash, Carte).
   * Si les clés FedaPay ne sont pas configurées, génère une simulation élégante pour les tests.
   */
  async initiatePayment(
    user: Utilisateur,
    plan: PlanAbonnementEnum,
    moyenPaiement?: string,
    phoneNumber?: string,
    callbackUrl?: string,
  ): Promise<FedaPayTransactionResult> {
    const amount = plan === PlanAbonnementEnum.PREMIUM_ANNUEL ? 10000 : 1000;
    const planLabel =
      plan === PlanAbonnementEnum.PREMIUM_ANNUEL
        ? 'Abonnement Annuel Premium (10 000 XOF)'
        : 'Abonnement Mensuel Premium (1 000 XOF)';

    const effectiveCallback = callbackUrl || this.defaultCallbackUrl;

    if (!this.isConfigured()) {
      if (this.isLiveEnvironment()) {
        this.logger.error(
          'Tentative de paiement en mode LIVE sans clé secrète FedaPay configurée (FEDAPAY_SECRET_KEY).',
        );
        throw new BadRequestException(
          'Passerelle de paiement FedaPay Live non configurée sur le serveur.',
        );
      }

      this.logger.warn(
        `Clés FedaPay non configurées (FEDAPAY_SECRET_KEY). Mode simulation sandbox activé pour l'utilisatrice ${user.id}.`,
      );

      const simPrefix = plan === PlanAbonnementEnum.PREMIUM_ANNUEL ? 'FEDASIM-ANN' : 'FEDASIM-MEN';
      const simId = `${simPrefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      return {
        transactionId: simId,
        token: `sim_token_${Date.now()}`,
        checkoutUrl: `https://checkout.fedapay.com/demo?ref=${simId}&amount=${amount}`,
        amount,
        devise: 'XOF',
        plan,
        mode: 'simulation',
        message:
          'Mode Simulation FedaPay actif (ajoutez FEDAPAY_SECRET_KEY dans .env pour passer en environnement réel).',
      };
    }

    try {
      // 1. Création de la transaction FedaPay
      const phoneToUse = phoneNumber || (user as any).telephone || '90000000';
      const cleanPhone = phoneToUse.replace(/[^0-9]/g, '');

      const userAny = user as any;
      const firstname = userAny.profil?.prenom || userAny.prenom || 'Utilisatrice';
      const lastname = userAny.profil?.nom || userAny.nom || 'FertiliteApp';

      const payload = {
        description: `FertiliteApp - ${planLabel}`,
        amount,
        currency: {
          iso: 'XOF',
        },
        callback_url: effectiveCallback,
        custom_metadata: {
          userId: user.id,
          plan,
          moyenPaiement: moyenPaiement || 'auto',
        },
        customer: {
          firstname,
          lastname,
          email: user.email,
          phone_number: {
            number: cleanPhone.length >= 8 ? cleanPhone.slice(-8) : '90000000',
            country: 'BJ', // Bénin par défaut (UEMOA)
          },
        },
      };

      const response = await fetch(`${this.apiBaseUrl}/transactions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Erreur création transaction FedaPay: ${errorBody}`);
        throw new BadRequestException(
          `Impossible de créer la transaction FedaPay (${response.statusText}).`,
        );
      }

      const txData: any = await response.json();
      const transaction =
        txData['v1/transaction'] || txData.v1?.transaction || txData.transaction || txData;
      if (!transaction?.id) {
        this.logger.error(`Réponse FedaPay inattendue (id manquant): ${JSON.stringify(txData)}`);
        throw new BadRequestException(
          'Réponse invalide de la passerelle FedaPay lors de la création de la transaction.',
        );
      }
      const transactionId = String(transaction.id);

      // 2. Génération du Checkout Token FedaPay
      const tokenResponse = await fetch(
        `${this.apiBaseUrl}/transactions/${transactionId}/token`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      let checkoutUrl = '';
      let token = '';

      if (tokenResponse.ok) {
        const tokenData: any = await tokenResponse.json();
        const tokenObj = tokenData['v1/token'] || tokenData;
        token = tokenObj.token || tokenData.token || '';
        checkoutUrl =
          tokenObj.url ||
          tokenData.url ||
          (this.environment === 'live'
            ? `https://checkout.fedapay.com/v1/?token=${token}`
            : `https://sandbox-checkout.fedapay.com/v1/?token=${token}`);
      } else {
        checkoutUrl =
          this.environment === 'live'
            ? `https://checkout.fedapay.com/v1/?tx=${transactionId}`
            : `https://sandbox-checkout.fedapay.com/v1/?tx=${transactionId}`;
      }

      return {
        transactionId,
        token,
        checkoutUrl,
        amount,
        devise: 'XOF',
        plan,
        mode: this.environment === 'live' ? 'fedapay_live' : 'fedapay_sandbox',
        message: 'Transaction FedaPay initialisée avec succès.',
      };
    } catch (error: any) {
      this.logger.error(`Exception FedaPay initiatePayment: ${error.message}`, error.stack);
      throw new BadRequestException(
        error.message || 'Erreur lors de la communication avec la passerelle FedaPay.',
      );
    }
  }

  /**
   * Vérifie le statut d'une transaction FedaPay auprès de l'API.
   * En environnement LIVE, les références simulées (FEDASIM-) sont strictement rejetées.
   */
  async verifyTransaction(transactionId: string): Promise<FedaPayVerificationResult> {
    const isSimulatedId = transactionId.startsWith('FEDASIM-');

    if (isSimulatedId) {
      if (this.isLiveEnvironment()) {
        this.logger.warn(
          `Rejet de la transaction simulée ${transactionId} en environnement LIVE.`,
        );
        return {
          approved: false,
          transactionId,
          status: 'rejected_simulation',
        };
      }

      const simAmount = transactionId.startsWith('FEDASIM-ANN-') ? 10000 : 1000;
      return {
        approved: true,
        transactionId,
        status: 'approved',
        amount: simAmount,
      };
    }

    if (!this.isConfigured()) {
      if (this.isLiveEnvironment()) {
        this.logger.error(
          'Impossible de vérifier la transaction : FEDAPAY_SECRET_KEY manquante en mode LIVE.',
        );
        return {
          approved: false,
          transactionId,
          status: 'not_configured',
        };
      }

      const simAmount = transactionId.startsWith('FEDASIM-ANN-') ? 10000 : 1000;
      return {
        approved: true,
        transactionId,
        status: 'approved',
        amount: simAmount,
      };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Erreur vérification FedaPay: ${errorText}`);
        return {
          approved: false,
          transactionId,
          status: 'error',
        };
      }

      const data: any = await response.json();
      const transaction =
        data['v1/transaction'] || data.v1?.transaction || data.transaction || data;
      const status = (transaction.status || '').toLowerCase();

      return {
        approved: status === 'approved',
        transactionId,
        status,
        amount: transaction.amount,
        raw: transaction,
      };
    } catch (error: any) {
      this.logger.error(`Exception vérification transaction ${transactionId}: ${error.message}`);
      return {
        approved: false,
        transactionId,
        status: 'exception',
      };
    }
  }
}

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { PreferenceNotification } from './entities/preference-notification.entity';
import {
  TypeNotificationEnum,
  CanalNotificationEnum,
  StatutNotificationEnum,
} from './entities/notification-enums';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { Prediction } from '../fertility/entities/prediction.entity';
import { Cycle, StatutCycleEnum } from '../cycles/entities/cycle.entity';
import { JourRegles } from '../cycles/entities/jour-regles.entity';
import { TemperatureBasale } from '../observations/entities/temperature-basale.entity';
import { GlaireCervicale } from '../observations/entities/glaire-cervicale.entity';
import { ObservationSymptome } from '../observations/entities/observation-symptome.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(PreferenceNotification)
    private readonly preferencesRepo: Repository<PreferenceNotification>,
    @InjectRepository(Prediction)
    private readonly predictionRepo: Repository<Prediction>,
    @InjectRepository(Cycle)
    private readonly cycleRepo: Repository<Cycle>,
    @InjectRepository(JourRegles)
    private readonly jourReglesRepo: Repository<JourRegles>,
    @InjectRepository(TemperatureBasale)
    private readonly tempRepo: Repository<TemperatureBasale>,
    @InjectRepository(GlaireCervicale)
    private readonly glaireRepo: Repository<GlaireCervicale>,
    @InjectRepository(ObservationSymptome)
    private readonly symptomeRepo: Repository<ObservationSymptome>,
  ) {}

  /**
   * UC-22: Récupération des préférences de notifications (avec initialisation par défaut)
   */
  async getPreferences(userId: string): Promise<PreferenceNotification> {
    let prefs = await this.preferencesRepo.findOne({
      where: { utilisateurId: userId },
    });

    if (!prefs) {
      prefs = this.preferencesRepo.create({
        utilisateurId: userId,
        rappelSaisieActif: true,
        heureRappelSaisie: '20:00',
        alerteFenetreFertile: true,
        alerteReglesPrevues: true,
        canalPush: true,
        canalEmail: false,
        canalInApp: true,
      });
      prefs = await this.preferencesRepo.save(prefs);
    }

    return prefs;
  }

  /**
   * UC-22: Mise à jour des préférences de notifications
   */
  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<PreferenceNotification> {
    const prefs = await this.getPreferences(userId);

    if (dto.rappelSaisieActif !== undefined) {
      prefs.rappelSaisieActif = dto.rappelSaisieActif;
    }
    if (dto.heureRappelSaisie !== undefined) {
      prefs.heureRappelSaisie = dto.heureRappelSaisie;
    }
    if (dto.alerteFenetreFertile !== undefined) {
      prefs.alerteFenetreFertile = dto.alerteFenetreFertile;
    }
    if (dto.alerteReglesPrevues !== undefined) {
      prefs.alerteReglesPrevues = dto.alerteReglesPrevues;
    }
    if (dto.canalPush !== undefined) {
      prefs.canalPush = dto.canalPush;
    }
    if (dto.canalEmail !== undefined) {
      prefs.canalEmail = dto.canalEmail;
    }
    if (dto.canalInApp !== undefined) {
      prefs.canalInApp = dto.canalInApp;
    }
    if (dto.fcmToken !== undefined) {
      prefs.fcmToken = dto.fcmToken;
    }

    return this.preferencesRepo.save(prefs);
  }

  /**
   * Boîte de réception des notifications pour l'utilisatrice
   */
  async getNotifications(userId: string) {
    const items = await this.notificationRepo.find({
      where: { utilisateurId: userId },
      order: { datePlanifiee: 'DESC', dateCreation: 'DESC' },
      take: 50,
    });

    const unreadCount = items.filter(
      (n) => n.statut !== StatutNotificationEnum.LUE,
    ).length;

    return {
      total: items.length,
      unreadCount,
      items,
    };
  }

  /**
   * Marquage d'une notification comme lue
   */
  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notif = await this.notificationRepo.findOne({
      where: { id: notificationId, utilisateurId: userId },
    });

    if (!notif) {
      throw new NotFoundException('Notification introuvable');
    }

    notif.statut = StatutNotificationEnum.LUE;
    notif.dateLecture = new Date();
    return this.notificationRepo.save(notif);
  }

  /**
   * Marquage de toutes les notifications comme lues
   */
  async markAllAsRead(userId: string) {
    const unread = await this.notificationRepo.find({
      where: { utilisateurId: userId },
    });

    const toUpdate = unread.filter((n) => n.statut !== StatutNotificationEnum.LUE);
    const now = new Date();

    for (const notif of toUpdate) {
      notif.statut = StatutNotificationEnum.LUE;
      notif.dateLecture = now;
    }

    if (toUpdate.length > 0) {
      await this.notificationRepo.save(toUpdate);
    }

    return { updatedCount: toUpdate.length };
  }

  /**
   * Envoi d'une notification de test en direct pour vérifier la réception
   */
  async sendTestNotification(userId: string): Promise<Notification> {
    const now = new Date();
    const notif = this.notificationRepo.create({
      utilisateurId: userId,
      type: TypeNotificationEnum.INFORMATION_GENERALE,
      canal: CanalNotificationEnum.PUSH,
      statut: StatutNotificationEnum.ENVOYEE,
      titre: '✨ Test des alertes FEMAX',
      message:
        'Vos notifications et rappels physiologiques sont parfaitement configurés et opérationnels sur votre appareil.',
      datePlanifiee: now,
      dateEnvoi: now,
      donneesSupplementaires: { test: true, timestamp: now.toISOString() },
    });

    return this.notificationRepo.save(notif);
  }

  /**
   * UC-20 & UC-21: Moteur d'évaluation et de planification des alertes physiologiques
   */
  async evaluateReminders(userId: string) {
    const prefs = await this.getPreferences(userId);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const notificationsCreated: Notification[] = [];

    // --- 1. UC-20 : Rappel de saisie en fin de journée ---
    if (prefs.rappelSaisieActif) {
      const hasTemp = await this.tempRepo.findOne({
        where: { utilisateurId: userId, date: todayStr },
      });
      const hasGlaire = await this.glaireRepo.findOne({
        where: { utilisateurId: userId, date: todayStr },
      });
      const hasSymptome = await this.symptomeRepo.findOne({
        where: { utilisateurId: userId, date: todayStr },
      });

      // Vérifier également s'il y a un flux de règles enregistré aujourd'hui
      const hasRegles = await this.jourReglesRepo
        .createQueryBuilder('jr')
        .innerJoin('jr.cycle', 'cycle')
        .where('cycle.utilisateurId = :userId', { userId })
        .andWhere('jr.date = :date', { date: todayStr })
        .getOne();

      const hasLoggedToday = !!(hasTemp || hasGlaire || hasSymptome || hasRegles);

      if (!hasLoggedToday) {
        // Vérifier si un rappel de saisie a déjà été émis pour aujourd'hui
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const existingReminder = await this.notificationRepo.findOne({
          where: {
            utilisateurId: userId,
            type: TypeNotificationEnum.RAPPEL_SAISIE,
            datePlanifiee: Between(startOfDay, endOfDay),
          },
        });

        if (!existingReminder) {
          const reminder = this.notificationRepo.create({
            utilisateurId: userId,
            type: TypeNotificationEnum.RAPPEL_SAISIE,
            canal: prefs.canalPush ? CanalNotificationEnum.PUSH : CanalNotificationEnum.IN_APP,
            statut: StatutNotificationEnum.ENVOYEE,
            titre: '🌿 Moment d’écoute : Vos observations du jour',
            message:
              'Prenez un instant pour noter vos ressentis, température ou symptômes et affiner la précision de votre cycle.',
            datePlanifiee: today,
            dateEnvoi: today,
            donneesSupplementaires: { targetDate: todayStr },
          });
          notificationsCreated.push(await this.notificationRepo.save(reminder));
        }
      }
    }

    // --- 2. UC-21 : Alerte Fenêtre Fertile à J-2 ---
    if (prefs.alerteFenetreFertile) {
      const activePrediction = await this.predictionRepo.findOne({
        where: { utilisateurId: userId, estActive: true },
        order: { dateGeneration: 'DESC' },
      });

      if (activePrediction && activePrediction.dateDebutFenetreFertile) {
        const fertileStart = new Date(activePrediction.dateDebutFenetreFertile);
        const timeDiff = fertileStart.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Déclencher si l'on est entre J-2 et le jour même de début de fenêtre
        if (daysDiff >= 0 && daysDiff <= 2) {
          const existingFertileAlert = await this.notificationRepo.findOne({
            where: {
              utilisateurId: userId,
              type: TypeNotificationEnum.FENETRE_FERTILE,
              datePlanifiee: MoreThanOrEqual(
                new Date(today.getTime() - 3 * 24 * 3600 * 1000),
              ),
            },
          });

          if (!existingFertileAlert) {
            const daysLabel =
              daysDiff === 0
                ? "aujourd'hui"
                : daysDiff === 1
                  ? 'demain'
                  : 'dans 48h';
            const alert = this.notificationRepo.create({
              utilisateurId: userId,
              type: TypeNotificationEnum.FENETRE_FERTILE,
              canal: prefs.canalPush ? CanalNotificationEnum.PUSH : CanalNotificationEnum.IN_APP,
              statut: StatutNotificationEnum.ENVOYEE,
              titre: '🌸 Fenêtre fertile imminente',
              message: `Votre période d'ovulation et de fertilité optimale débute ${daysLabel}. Consultez votre calendrier pour les détails.`,
              datePlanifiee: today,
              dateEnvoi: today,
              donneesSupplementaires: {
                fertileStart: activePrediction.dateDebutFenetreFertile,
                fertileEnd: activePrediction.dateFinFenetreFertile,
                ovulation: activePrediction.dateOvulationEstimee,
              },
            });
            notificationsCreated.push(await this.notificationRepo.save(alert));
          }
        }
      }
    }

    // --- 3. Alerte règles prévues ---
    if (prefs.alerteReglesPrevues) {
      const currentCycle = await this.cycleRepo.findOne({
        where: { utilisateurId: userId, statut: StatutCycleEnum.EN_COURS },
      });

      if (currentCycle) {
        const cycleStart = new Date(currentCycle.dateDebut);
        const avgCycleDuration = currentCycle.dureeCycleJours || 28;
        const expectedPeriodDate = new Date(cycleStart);
        expectedPeriodDate.setDate(cycleStart.getDate() + avgCycleDuration);

        const daysDiff = Math.ceil(
          (expectedPeriodDate.getTime() - today.getTime()) / (1000 * 3600 * 24),
        );

        if (daysDiff >= 0 && daysDiff <= 2) {
          const existingPeriodAlert = await this.notificationRepo.findOne({
            where: {
              utilisateurId: userId,
              type: TypeNotificationEnum.REGLES_PREVUES,
              datePlanifiee: MoreThanOrEqual(
                new Date(today.getTime() - 4 * 24 * 3600 * 1000),
              ),
            },
          });

          if (!existingPeriodAlert) {
            const alert = this.notificationRepo.create({
              utilisateurId: userId,
              type: TypeNotificationEnum.REGLES_PREVUES,
              canal: prefs.canalPush ? CanalNotificationEnum.PUSH : CanalNotificationEnum.IN_APP,
              statut: StatutNotificationEnum.ENVOYEE,
              titre: '🩸 Prévision des prochaines règles',
              message:
                'Selon vos cycles précédents, vos prochaines règles devraient arriver d’ici 24 à 48 heures.',
              datePlanifiee: today,
              dateEnvoi: today,
              donneesSupplementaires: {
                expectedDate: expectedPeriodDate.toISOString().split('T')[0],
              },
            });
            notificationsCreated.push(await this.notificationRepo.save(alert));
          }
        }
      }
    }

    return {
      evaluated: true,
      createdCount: notificationsCreated.length,
      notifications: notificationsCreated,
    };
  }
}

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Prediction } from './entities/prediction.entity';
import { FacteurExplicatif } from './entities/facteur-explicatif.entity';
import { VersionMoteurPrediction } from './entities/version-moteur-prediction.entity';
import {
  TypeMoteurEnum,
  MethodePredictionEnum,
  CategorieFertiliteEnum,
  NiveauConfianceEnum,
} from './entities/fertility-enums';
import { HybridEngine } from './engines/hybrid.engine';
import {
  FertilityInput,
  FertilityCycleHistory,
  FertilityObservationPoint,
} from './interfaces/fertility-estimator.interface';
import { ProfilUtilisateur } from '../users/entities/profil-utilisateur.entity';
import { Cycle, StatutCycleEnum } from '../cycles/entities/cycle.entity';
import { JourRegles } from '../cycles/entities/jour-regles.entity';
import { ObservationsService } from '../observations/observations.service';
import {
  FertilityPredictionResponseDto,
  FactorResponseDto,
} from './dto/fertility-response.dto';
import {
  CalendarMonthResponseDto,
  CalendarDaySummaryDto,
} from './dto/calendar-month.dto';

@Injectable()
export class FertilityService {
  private readonly logger = new Logger(FertilityService.name);

  constructor(
    @InjectRepository(Prediction)
    private readonly predictionRepo: Repository<Prediction>,
    @InjectRepository(FacteurExplicatif)
    private readonly facteurRepo: Repository<FacteurExplicatif>,
    @InjectRepository(VersionMoteurPrediction)
    private readonly versionMoteurRepo: Repository<VersionMoteurPrediction>,
    @InjectRepository(ProfilUtilisateur)
    private readonly profilRepo: Repository<ProfilUtilisateur>,
    @InjectRepository(Cycle)
    private readonly cycleRepo: Repository<Cycle>,
    @InjectRepository(JourRegles)
    private readonly jourReglesRepo: Repository<JourRegles>,
    private readonly hybridEngine: HybridEngine,
    private readonly observationsService: ObservationsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * UC-13 : Recalcul et enregistrement append-only d'une estimation
   */
  async calculateAndSavePrediction(
    userId: string,
    evaluationDate?: string,
  ): Promise<FertilityPredictionResponseDto> {
    const evalDate = evaluationDate || new Date().toISOString().split('T')[0];

    // 1. Récupération du profil utilisateur
    const profil = await this.profilRepo.findOne({ where: { utilisateurId: userId } });
    const declaredDuration = profil?.dureeCycleHabituelleJours || 28;
    const declaredPeriodDuration = profil?.dureeReglesHabituelleJours || 5;
    const isIrregular = profil?.irregulariteDeclaree || false;

    // 2. Récupération des cycles
    const cycles = await this.cycleRepo.find({
      where: { utilisateurId: userId },
      order: { dateDebut: 'DESC' },
    });

    const activeCycle = cycles.find((c) => c.statut === StatutCycleEnum.EN_COURS);
    const pastCompletedCycles = cycles.filter(
      (c) => c.dureeCycleJours && c.dureeCycleJours > 0,
    );

    // Détermination de la date de début du cycle actif (ou repli sur profil / date courante)
    const currentCycleStartDate =
      activeCycle?.dateDebut ||
      profil?.dateDernieresReglesConnues ||
      evalDate;

    const history: FertilityCycleHistory[] = pastCompletedCycles.map((c) => ({
      cycleId: c.id,
      startDate: c.dateDebut,
      endDate: c.dateFin,
      cycleLengthDays: c.dureeCycleJours,
      periodDurationDays: c.dureeReglesJours,
    }));

    // 3. Récupération des observations récentes (30 derniers jours)
    const thirtyDaysAgo = new Date(evalDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const obsHistory = await this.observationsService.getObservationsHistory(
      userId,
      startDateStr,
      evalDate,
    );

    // Normalisation des observations par date
    const obsMap = new Map<string, FertilityObservationPoint>();

    obsHistory.temperatures.forEach((t) => {
      const p = obsMap.get(t.date) || { date: t.date };
      p.basalTemperatureCelsius = Number(t.temperatureCelsius);
      obsMap.set(t.date, p);
    });

    obsHistory.glaires.forEach((g) => {
      const p = obsMap.get(g.date) || { date: g.date };
      p.cervicalMucusType = g.typeGlaire;
      obsMap.set(g.date, p);
    });

    obsHistory.testsLh.forEach((lh) => {
      const p = obsMap.get(lh.date) || { date: lh.date };
      p.lhTestResult = lh.resultat;
      obsMap.set(lh.date, p);
    });

    const observations = Array.from(obsMap.values());

    // 4. Appel au Fertility Engine
    const input: FertilityInput = {
      userId,
      cycleId: activeCycle?.id || null,
      currentCycleStartDate,
      declaredCycleDurationDays: declaredDuration,
      declaredPeriodDurationDays: declaredPeriodDuration,
      declaredIrregularity: isIrregular,
      history,
      observations,
      evaluationDate: evalDate,
    };

    const output = await this.hybridEngine.estimate(input);

    // 5. Version moteur
    let engineVersion = await this.versionMoteurRepo.findOne({
      where: { numeroVersion: output.modelVersion },
    });

    if (!engineVersion) {
      engineVersion = this.versionMoteurRepo.create({
        numeroVersion: output.modelVersion,
        typeMoteur:
          output.algorithm === 'statistical_v1'
            ? TypeMoteurEnum.REGLES_STATISTIQUES
            : TypeMoteurEnum.REGLES_STATISTIQUES,
        metriquesPerformance: {
          precisionCibleJours: output.uncertaintyMarginDays,
          algorithm: output.algorithm,
        },
        actif: true,
      });
      engineVersion = await this.versionMoteurRepo.save(engineVersion);
    }

    // 6. Sauvegarde transactionnelle append-only
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedPrediction: Prediction;
    try {
      // Désactiver la prédiction active précédente
      await queryRunner.manager.update(
        Prediction,
        { utilisateurId: userId, estActive: true },
        { estActive: false },
      );

      // Créer la nouvelle prédiction
      const newPrediction = queryRunner.manager.create(Prediction, {
        utilisateurId: userId,
        cycleId: activeCycle?.id || null,
        versionMoteurId: engineVersion.id,
        dateOvulationEstimee: output.estimatedOvulationDate,
        margeIncertitudeJours: output.uncertaintyMarginDays,
        dateDebutFenetreFertile: output.fertileWindowStartDate,
        dateFinFenetreFertile: output.fertileWindowEndDate,
        scoreFertiliteCategorie: output.fertilityCategory as CategorieFertiliteEnum,
        scoreFertiliteValeur: output.fertilityScoreValue,
        niveauConfiance: output.confidenceLevel as NiveauConfianceEnum,
        methodeUtilisee: output.method as MethodePredictionEnum,
        estActive: true,
      });

      savedPrediction = await queryRunner.manager.save(Prediction, newPrediction);

      // Créer les facteurs explicatifs associés
      const facteursToSave = output.factors.map((f) =>
        queryRunner.manager.create(FacteurExplicatif, {
          predictionId: savedPrediction.id,
          typeFacteur: f.factorType as any,
          description: f.description,
          poidsContribution: f.contributionWeight,
          sensEffet: f.effectDirection as any,
          ordreAffichage: f.displayOrder,
        }),
      );

      await queryRunner.manager.save(FacteurExplicatif, facteursToSave);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Erreur transaction recalcul fertilité : ${err.message}`, err.stack);
      throw err;
    } finally {
      await queryRunner.release();
    }

    return this.mapToResponseDto(savedPrediction, output.factors, engineVersion.numeroVersion, output.algorithm);
  }

  /**
   * UC-14 : Récupérer la prédiction active courante
   */
  async getCurrentPrediction(userId: string): Promise<FertilityPredictionResponseDto> {
    const active = await this.predictionRepo.findOne({
      where: { utilisateurId: userId, estActive: true },
      relations: {
        facteurs: true,
        versionMoteur: true,
      },
    });

    if (!active) {
      // Si aucune prédiction n'existe, on génère la première immédiatement
      return this.calculateAndSavePrediction(userId);
    }

    // Tri des facteurs par ordre d'affichage
    const sortedFactors = (active.facteurs || []).sort(
      (a, b) => a.ordreAffichage - b.ordreAffichage,
    );

    const factorsDto: FactorResponseDto[] = sortedFactors.map((f) => ({
      id: f.id,
      type: f.typeFacteur,
      description: f.description,
      weight: Number(f.poidsContribution),
      direction: f.sensEffet,
      displayOrder: f.ordreAffichage,
    }));

    return {
      predictionId: active.id,
      generationDate: active.dateGeneration,
      estimatedOvulationDate: active.dateOvulationEstimee,
      uncertaintyMarginDays: active.margeIncertitudeJours,
      fertileWindow: {
        startDate: active.dateDebutFenetreFertile || '',
        endDate: active.dateFinFenetreFertile || '',
      },
      fertilityCategory: active.scoreFertiliteCategorie,
      fertilityScoreValue: Number(active.scoreFertiliteValeur),
      confidenceLevel: active.niveauConfiance,
      method: active.methodeUtilisee,
      algorithm: active.versionMoteur?.numeroVersion || 'calendar_v1',
      modelVersion: active.versionMoteur?.numeroVersion || 'v1.0-calendrier',
      factors: factorsDto,
    };
  }

  /**
   * UC-15 : Explication de la prédiction active
   */
  async getCurrentFactors(userId: string): Promise<FactorResponseDto[]> {
    const current = await this.getCurrentPrediction(userId);
    return current.factors;
  }

  /**
   * Historique immuable des estimations
   */
  async getPredictionHistory(userId: string, limit = 10): Promise<FertilityPredictionResponseDto[]> {
    const predictions = await this.predictionRepo.find({
      where: { utilisateurId: userId },
      relations: { facteurs: true, versionMoteur: true },
      order: { dateGeneration: 'DESC' },
      take: limit,
    });

    return predictions.map((p) => {
      const sortedFactors = (p.facteurs || []).sort((a, b) => a.ordreAffichage - b.ordreAffichage);
      return {
        predictionId: p.id,
        generationDate: p.dateGeneration,
        estimatedOvulationDate: p.dateOvulationEstimee,
        uncertaintyMarginDays: p.margeIncertitudeJours,
        fertileWindow: {
          startDate: p.dateDebutFenetreFertile || '',
          endDate: p.dateFinFenetreFertile || '',
        },
        fertilityCategory: p.scoreFertiliteCategorie,
        fertilityScoreValue: Number(p.scoreFertiliteValeur),
        confidenceLevel: p.niveauConfiance,
        method: p.methodeUtilisee,
        algorithm: p.versionMoteur?.numeroVersion || 'calendar_v1',
        modelVersion: p.versionMoteur?.numeroVersion || 'v1.0-calendrier',
        factors: sortedFactors.map((f) => ({
          id: f.id,
          type: f.typeFacteur,
          description: f.description,
          weight: Number(f.poidsContribution),
          direction: f.sensEffet,
          displayOrder: f.ordreAffichage,
        })),
      };
    });
  }

  /**
   * UC-11 : Vue Calendrier mensuel agrégée
   */
  async getMonthCalendar(
    userId: string,
    year: number,
    month: number,
  ): Promise<CalendarMonthResponseDto> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const [activeCycle, currentPrediction, joursRegles] = await Promise.all([
      this.cycleRepo.findOne({
        where: { utilisateurId: userId, statut: StatutCycleEnum.EN_COURS },
      }),
      this.getCurrentPrediction(userId),
      this.jourReglesRepo
        .createQueryBuilder('jr')
        .innerJoin('jr.cycle', 'c')
        .where('c.utilisateurId = :userId', { userId })
        .andWhere('jr.date BETWEEN :startDate AND :endDate', { startDate, endDate })
        .getMany(),
    ]);

    const joursMap = new Map<string, JourRegles>();
    joursRegles.forEach((jr) => joursMap.set(jr.date, jr));

    const fertileStart = currentPrediction.fertileWindow.startDate;
    const fertileEnd = currentPrediction.fertileWindow.endDate;
    const ovulationDate = currentPrediction.estimatedOvulationDate;

    const daysCount = new Date(year, month, 0).getDate();
    const days: CalendarDaySummaryDto[] = [];

    for (let day = 1; day <= daysCount; day++) {
      const dayDate = new Date(year, month - 1, day);
      const dateStr = dayDate.toISOString().split('T')[0];

      const jour = joursMap.get(dateStr);
      const isPeriodDay = !!jour && jour.intensiteFlux !== ('absent' as any);
      const isFertileDay =
        !!fertileStart && !!fertileEnd && dateStr >= fertileStart && dateStr <= fertileEnd;
      const isOvulationDay = !!ovulationDate && dateStr === ovulationDate;

      days.push({
        date: dateStr,
        isPeriodDay,
        flowIntensity: jour?.intensiteFlux || null,
        painLevel: jour?.douleurNiveau ?? null,
        isFertileDay,
        isOvulationDay,
        fertilityCategory: isFertileDay
          ? isOvulationDay
            ? CategorieFertiliteEnum.ELEVEE
            : CategorieFertiliteEnum.MOYENNE
          : CategorieFertiliteEnum.FAIBLE,
        hasObservations: !!jour,
      });
    }

    return {
      year,
      month,
      activeCycleId: activeCycle?.id || null,
      estimatedOvulationDate: ovulationDate,
      fertileWindowStartDate: fertileStart,
      fertileWindowEndDate: fertileEnd,
      days,
    };
  }

  /**
   * UC-12 : Détail clinique et prédictif complet pour une date donnée
   */
  async getDayDetail(userId: string, date: string) {
    const [dayObs, currentPrediction] = await Promise.all([
      this.observationsService.getDayObservations(userId, date),
      this.getCurrentPrediction(userId),
    ]);

    const isOvulationDay = currentPrediction.estimatedOvulationDate === date;
    const isFertileDay =
      date >= currentPrediction.fertileWindow.startDate &&
      date <= currentPrediction.fertileWindow.endDate;

    return {
      date,
      fertility: {
        score: currentPrediction.fertilityScoreValue,
        category: currentPrediction.fertilityCategory,
        confidence: currentPrediction.confidenceLevel,
        isFertileDay,
        isOvulationDay,
        estimatedOvulationDate: currentPrediction.estimatedOvulationDate,
        fertileWindow: currentPrediction.fertileWindow,
      },
      observations: dayObs,
    };
  }

  private mapToResponseDto(
    prediction: Prediction,
    factors: any[],
    modelVersion: string,
    algorithm: string,
  ): FertilityPredictionResponseDto {
    return {
      predictionId: prediction.id,
      generationDate: prediction.dateGeneration,
      estimatedOvulationDate: prediction.dateOvulationEstimee,
      uncertaintyMarginDays: prediction.margeIncertitudeJours,
      fertileWindow: {
        startDate: prediction.dateDebutFenetreFertile || '',
        endDate: prediction.dateFinFenetreFertile || '',
      },
      fertilityCategory: prediction.scoreFertiliteCategorie,
      fertilityScoreValue: Number(prediction.scoreFertiliteValeur),
      confidenceLevel: prediction.niveauConfiance,
      method: prediction.methodeUtilisee,
      algorithm,
      modelVersion,
      factors: factors.map((f, idx) => ({
        type: f.factorType,
        description: f.description,
        weight: f.contributionWeight,
        direction: f.effectDirection,
        displayOrder: f.displayOrder || idx + 1,
      })),
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cycle, StatutCycleEnum } from './entities/cycle.entity';
import { JourRegles, IntensiteFluxEnum } from './entities/jour-regles.entity';
import { StartCycleDto } from './dto/start-cycle.dto';
import { LogFlowDto } from './dto/log-flow.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';

@Injectable()
export class CyclesService {
  constructor(
    @InjectRepository(Cycle)
    private readonly cycleRepo: Repository<Cycle>,
    @InjectRepository(JourRegles)
    private readonly jourReglesRepo: Repository<JourRegles>,
  ) {}

  /**
   * UC-07 : Démarrer un nouveau cycle (Début des règles)
   */
  async startCycle(userId: string, dto: StartCycleDto): Promise<Cycle> {
    const newStartDate = new Date(dto.dateDebut);

    // 1. Recherche d'un éventuel cycle actif 'en_cours'
    const activeCycle = await this.cycleRepo.findOne({
      where: { utilisateurId: userId, statut: StatutCycleEnum.EN_COURS },
    });

    if (activeCycle) {
      const activeStartDate = new Date(activeCycle.dateDebut);
      if (newStartDate <= activeStartDate) {
        throw new BadRequestException(
          'La date de début du nouveau cycle doit être postérieure au cycle en cours.',
        );
      }

      // Clôture du cycle précédent
      const prevEndDate = new Date(newStartDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);

      const diffTime = Math.abs(prevEndDate.getTime() - activeStartDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      activeCycle.dateFin = prevEndDate.toISOString().split('T')[0];
      activeCycle.dureeCycleJours = diffDays;
      activeCycle.statut = StatutCycleEnum.TERMINE;
      await this.cycleRepo.save(activeCycle);
    }

    // 2. Création du nouveau cycle
    const newCycle = this.cycleRepo.create({
      utilisateurId: userId,
      dateDebut: dto.dateDebut,
      sourceSaisie: dto.sourceSaisie,
      idClientLocal: dto.idClientLocal,
      statut: StatutCycleEnum.EN_COURS,
      dureeReglesJours: 1,
    });
    const savedCycle = await this.cycleRepo.save(newCycle);

    // 3. Enregistrement du premier jour de flux si spécifié
    const flowIntensity = dto.intensiteFlux || IntensiteFluxEnum.MOYEN;
    const firstDay = this.jourReglesRepo.create({
      cycleId: savedCycle.id,
      date: dto.dateDebut,
      intensiteFlux: flowIntensity,
      douleurNiveau: dto.douleurNiveau ?? 0,
      notes: dto.notes,
      idClientLocal: dto.idClientLocal,
    });
    await this.jourReglesRepo.save(firstDay);

    return this.getCycleById(userId, savedCycle.id);
  }

  /**
   * UC-08 : Saisie quotidienne du flux & douleur
   */
  async logDayFlow(userId: string, dto: LogFlowDto): Promise<JourRegles> {
    const targetDate = dto.date;

    // Trouver le cycle correspondant (en cours ou contenant la date)
    let cycle = await this.cycleRepo.findOne({
      where: { utilisateurId: userId, statut: StatutCycleEnum.EN_COURS },
      relations: { joursRegles: true },
    });

    if (!cycle) {
      // Si aucun cycle actif, on en amorce un automatiquement à cette date
      cycle = await this.startCycle(userId, {
        dateDebut: targetDate,
        intensiteFlux: dto.intensiteFlux,
        douleurNiveau: dto.douleurNiveau,
        notes: dto.notes,
      });
    }

    // Vérifier si un enregistrement existe déjà pour ce jour dans le cycle
    let jour = await this.jourReglesRepo.findOne({
      where: { cycleId: cycle.id, date: targetDate },
    });

    if (jour) {
      jour.intensiteFlux = dto.intensiteFlux;
      if (dto.douleurNiveau !== undefined) jour.douleurNiveau = dto.douleurNiveau;
      if (dto.notes !== undefined) jour.notes = dto.notes;
    } else {
      jour = this.jourReglesRepo.create({
        cycleId: cycle.id,
        date: targetDate,
        intensiteFlux: dto.intensiteFlux,
        douleurNiveau: dto.douleurNiveau ?? 0,
        notes: dto.notes,
        idClientLocal: dto.idClientLocal,
      });
    }

    const savedJour = await this.jourReglesRepo.save(jour);

    // Recalculer le nombre de jours de règles du cycle
    const countFlowDays = await this.jourReglesRepo.count({
      where: { cycleId: cycle.id },
    });
    cycle.dureeReglesJours = countFlowDays;
    await this.cycleRepo.save(cycle);

    return savedJour;
  }

  /**
   * UC-10 : Historique de tous les cycles
   */
  async getCycles(userId: string): Promise<Cycle[]> {
    return this.cycleRepo.find({
      where: { utilisateurId: userId },
      relations: { joursRegles: true },
      order: { dateDebut: 'DESC' },
    });
  }

  /**
   * Consultation du cycle actif
   */
  async getActiveCycle(userId: string): Promise<Cycle | null> {
    return this.cycleRepo.findOne({
      where: { utilisateurId: userId, statut: StatutCycleEnum.EN_COURS },
      relations: { joursRegles: true },
    });
  }

  /**
   * Consultation d'un cycle par ID
   */
  async getCycleById(userId: string, cycleId: string): Promise<Cycle> {
    const cycle = await this.cycleRepo.findOne({
      where: { id: cycleId, utilisateurId: userId },
      relations: { joursRegles: true },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle introuvable');
    }

    return cycle;
  }

  /**
   * UC-09 : Modifier / corriger un cycle passé
   */
  async updateCycle(userId: string, cycleId: string, dto: UpdateCycleDto): Promise<Cycle> {
    const cycle = await this.getCycleById(userId, cycleId);

    if (dto.dateDebut) cycle.dateDebut = dto.dateDebut;
    if (dto.dateFin) cycle.dateFin = dto.dateFin;
    if (dto.statut) cycle.statut = dto.statut;

    if (cycle.dateDebut && cycle.dateFin) {
      const start = new Date(cycle.dateDebut);
      const end = new Date(cycle.dateFin);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      cycle.dureeCycleJours = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    return this.cycleRepo.save(cycle);
  }

  /**
   * Supprimer un cycle
   */
  async deleteCycle(userId: string, cycleId: string): Promise<void> {
    const cycle = await this.getCycleById(userId, cycleId);
    await this.jourReglesRepo.delete({ cycleId: cycle.id });
    await this.cycleRepo.delete(cycle.id);
  }

  /**
   * UC-23 : Statistiques et régularité des cycles
   */
  async getCycleStats(userId: string) {
    const cycles = await this.cycleRepo.find({
      where: { utilisateurId: userId },
      order: { dateDebut: 'DESC' },
    });

    const completed = cycles.filter((c) => c.dureeCycleJours && c.dureeCycleJours > 0);
    const totalCycles = cycles.length;
    const completedCycles = completed.length;

    let averageDuration = 28.0;
    let minDuration = 28;
    let maxDuration = 28;
    let standardDeviation = 0.0;
    let regularity: 'tres_regulier' | 'regulier' | 'irregulier' | 'indetermine' = 'indetermine';

    if (completedCycles > 0) {
      const sum = completed.reduce((acc, c) => acc + (c.dureeCycleJours ?? 28), 0);
      averageDuration = Math.round((sum / completedCycles) * 10) / 10;
      minDuration = Math.min(...completed.map((c) => c.dureeCycleJours!));
      maxDuration = Math.max(...completed.map((c) => c.dureeCycleJours!));

      if (completedCycles >= 2) {
        const variance =
          completed.reduce(
            (acc, c) => acc + Math.pow((c.dureeCycleJours ?? 28) - averageDuration, 2),
            0,
          ) / completedCycles;
        standardDeviation = Math.round(Math.sqrt(variance) * 10) / 10;

        if (standardDeviation < 2.0) {
          regularity = 'tres_regulier';
        } else if (standardDeviation <= 4.0) {
          regularity = 'regulier';
        } else {
          regularity = 'irregulier';
        }
      }
    }

    const periodDays = cycles.filter((c) => c.dureeReglesJours && c.dureeReglesJours > 0);
    const averagePeriodDuration = periodDays.length > 0
      ? Math.round(
          (periodDays.reduce((acc, c) => acc + (c.dureeReglesJours ?? 5), 0) / periodDays.length) * 10,
        ) / 10
      : 5.0;

    return {
      totalCycles,
      completedCycles,
      averageDuration,
      minDuration,
      maxDuration,
      standardDeviation,
      regularity,
      averagePeriodDuration,
      history: cycles.slice(0, 12).map((c) => ({
        cycleId: c.id,
        dateDebut: c.dateDebut,
        dateFin: c.dateFin,
        dureeCycleJours: c.dureeCycleJours,
        dureeReglesJours: c.dureeReglesJours,
        statut: c.statut,
      })),
    };
  }
}


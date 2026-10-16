import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { TemperatureBasale } from './entities/temperature-basale.entity';
import { GlaireCervicale } from './entities/glaire-cervicale.entity';
import { TestOvulation } from './entities/test-ovulation.entity';
import { TypeSymptome } from './entities/type-symptome.entity';
import { ObservationSymptome } from './entities/observation-symptome.entity';
import { RapportSexuel } from './entities/rapport-sexuel.entity';
import { CategorieSymptomeEnum } from './entities/observation-enums';
import { LogTemperatureDto } from './dto/log-temperature.dto';
import { LogCervicalMucusDto } from './dto/log-cervical-mucus.dto';
import { LogLhTestDto } from './dto/log-lh-test.dto';
import { LogSymptomsDto } from './dto/log-symptoms.dto';
import { LogIntercourseDto } from './dto/log-intercourse.dto';
import { SaveDayObservationDto } from './dto/save-day-observation.dto';
import { EncryptionService } from '../common/services/encryption.service';

@Injectable()
export class ObservationsService implements OnModuleInit {
  private readonly logger = new Logger(ObservationsService.name);

  constructor(
    @InjectRepository(TemperatureBasale)
    private readonly tempRepo: Repository<TemperatureBasale>,
    @InjectRepository(GlaireCervicale)
    private readonly glaireRepo: Repository<GlaireCervicale>,
    @InjectRepository(TestOvulation)
    private readonly lhRepo: Repository<TestOvulation>,
    @InjectRepository(TypeSymptome)
    private readonly typeSymptomeRepo: Repository<TypeSymptome>,
    @InjectRepository(ObservationSymptome)
    private readonly obsSymptomeRepo: Repository<ObservationSymptome>,
    @InjectRepository(RapportSexuel)
    private readonly rapportRepo: Repository<RapportSexuel>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async onModuleInit() {
    await this.seedSymptomCatalog();
  }

  /**
   * Initialise le catalogue de référence des symptômes si vide
   */
  async seedSymptomCatalog(): Promise<void> {
    const count = await this.typeSymptomeRepo.count();
    if (count > 0) return;

    const initialCatalog = [
      {
        code: 'tension_mammaire',
        nom: 'Tension mammaire',
        categorie: CategorieSymptomeEnum.PHYSIQUE,
        icone: 'healing',
        ordreAffichage: 1,
      },
      {
        code: 'douleur_ovulatoire',
        nom: 'Douleur ovulatoire (mittelschmerz)',
        categorie: CategorieSymptomeEnum.PHYSIQUE,
        icone: 'bolt',
        ordreAffichage: 2,
      },
      {
        code: 'crampes_pelviennes',
        nom: 'Crampes pelviennes',
        categorie: CategorieSymptomeEnum.PHYSIQUE,
        icone: 'spa',
        ordreAffichage: 3,
      },
      {
        code: 'maux_de_tete',
        nom: 'Maux de tête / Migraine',
        categorie: CategorieSymptomeEnum.PHYSIQUE,
        icone: 'psychology',
        ordreAffichage: 4,
      },
      {
        code: 'fatigue',
        nom: 'Fatigue',
        categorie: CategorieSymptomeEnum.PHYSIQUE,
        icone: 'battery_alert',
        ordreAffichage: 5,
      },
      {
        code: 'sautes_humeur',
        nom: "Sautes d'humeur",
        categorie: CategorieSymptomeEnum.EMOTIONNEL,
        icone: 'sentiment_dissatisfied',
        ordreAffichage: 6,
      },
      {
        code: 'anxiete',
        nom: 'Anxiété / Irritabilité',
        categorie: CategorieSymptomeEnum.EMOTIONNEL,
        icone: 'mood_bad',
        ordreAffichage: 7,
      },
      {
        code: 'energie_elevee',
        nom: "Regain d'énergie",
        categorie: CategorieSymptomeEnum.EMOTIONNEL,
        icone: 'sentiment_very_satisfied',
        ordreAffichage: 8,
      },
      {
        code: 'ballonnements',
        nom: 'Ballonnements',
        categorie: CategorieSymptomeEnum.DIGESTIF,
        icone: 'water',
        ordreAffichage: 9,
      },
      {
        code: 'acne',
        nom: "Poussée d'acné",
        categorie: CategorieSymptomeEnum.CUTANE,
        icone: 'face',
        ordreAffichage: 10,
      },
      {
        code: 'libido_elevee',
        nom: 'Libido accrue',
        categorie: CategorieSymptomeEnum.PHYSIQUE,
        icone: 'favorite',
        ordreAffichage: 11,
      },
    ];

    for (const item of initialCatalog) {
      const entity = this.typeSymptomeRepo.create(item);
      await this.typeSymptomeRepo.save(entity);
    }
    this.logger.log('Catalogue standard de symptômes initialisé.');
  }

  /**
   * Consultation du catalogue complet des types de symptômes
   */
  async getSymptomCatalog(): Promise<TypeSymptome[]> {
    return this.typeSymptomeRepo.find({
      where: { actif: true },
      order: { ordreAffichage: 'ASC' },
    });
  }

  /**
   * UC-16 : Enregistrement ou mise à jour de la température basale (BBT)
   */
  async logTemperature(userId: string, dto: LogTemperatureDto): Promise<TemperatureBasale> {
    let temp = await this.tempRepo.findOne({
      where: { utilisateurId: userId, date: dto.date },
    });

    if (temp) {
      temp.temperatureCelsius = dto.temperatureCelsius;
      if (dto.heurePrise !== undefined) temp.heurePrise = dto.heurePrise;
      if (dto.estPerturbee !== undefined) temp.estPerturbee = dto.estPerturbee;
      if (dto.facteurPerturbateur !== undefined) temp.facteurPerturbateur = dto.facteurPerturbateur;
      if (dto.notes !== undefined) temp.notes = dto.notes;
      if (dto.idClientLocal !== undefined) temp.idClientLocal = dto.idClientLocal;
    } else {
      temp = this.tempRepo.create({
        utilisateurId: userId,
        date: dto.date,
        temperatureCelsius: dto.temperatureCelsius,
        heurePrise: dto.heurePrise,
        estPerturbee: dto.estPerturbee ?? false,
        facteurPerturbateur: dto.facteurPerturbateur,
        notes: dto.notes,
        idClientLocal: dto.idClientLocal,
      });
    }

    return this.tempRepo.save(temp);
  }

  /**
   * UC-17 : Enregistrement ou mise à jour de la glaire cervicale
   */
  async logCervicalMucus(userId: string, dto: LogCervicalMucusDto): Promise<GlaireCervicale> {
    let mucus = await this.glaireRepo.findOne({
      where: { utilisateurId: userId, date: dto.date },
    });

    if (mucus) {
      mucus.typeGlaire = dto.typeGlaire;
      if (dto.quantite !== undefined) mucus.quantite = dto.quantite;
      if (dto.sensation !== undefined) mucus.sensation = dto.sensation;
      if (dto.notes !== undefined) mucus.notes = dto.notes;
      if (dto.idClientLocal !== undefined) mucus.idClientLocal = dto.idClientLocal;
    } else {
      mucus = this.glaireRepo.create({
        utilisateurId: userId,
        date: dto.date,
        typeGlaire: dto.typeGlaire,
        quantite: dto.quantite,
        sensation: dto.sensation,
        notes: dto.notes,
        idClientLocal: dto.idClientLocal,
      });
    }

    return this.glaireRepo.save(mucus);
  }

  /**
   * UC-18 : Enregistrement d'un test urinaire d'ovulation (LH)
   */
  async logLhTest(userId: string, dto: LogLhTestDto): Promise<TestOvulation> {
    const test = this.lhRepo.create({
      utilisateurId: userId,
      date: dto.date,
      heureTest: dto.heureTest,
      resultat: dto.resultat,
      valeurMUiMl: dto.valeurMUiMl,
      notes: dto.notes,
      idClientLocal: dto.idClientLocal,
    });

    return this.lhRepo.save(test);
  }

  /**
   * UC-19 : Enregistrement d'un lot de symptômes pour une date
   */
  async logSymptoms(userId: string, dto: LogSymptomsDto): Promise<ObservationSymptome[]> {
    const catalog = await this.getSymptomCatalog();
    const catalogMap = new Map<string, TypeSymptome>();
    for (const sym of catalog) {
      catalogMap.set(sym.code, sym);
      catalogMap.set(sym.id, sym);
    }

    const savedList: ObservationSymptome[] = [];

    for (const item of dto.symptomes) {
      const typeSymptome = catalogMap.get(item.code);
      if (!typeSymptome) {
        throw new BadRequestException(`Symptôme inconnu : ${item.code}`);
      }

      let obs = await this.obsSymptomeRepo.findOne({
        where: {
          utilisateurId: userId,
          date: dto.date,
          typeSymptomeId: typeSymptome.id,
        },
      });

      if (obs) {
        obs.intensite = item.intensite;
        if (item.notes !== undefined) obs.notes = item.notes;
      } else {
        obs = this.obsSymptomeRepo.create({
          utilisateurId: userId,
          date: dto.date,
          typeSymptomeId: typeSymptome.id,
          intensite: item.intensite,
          notes: item.notes,
          idClientLocal: dto.idClientLocal,
        });
      }

      const saved = await this.obsSymptomeRepo.save(obs);
      saved.typeSymptome = typeSymptome;
      savedList.push(saved);
    }

    return savedList;
  }

  /**
   * UC-24 : Enregistrement ou mise à jour d'un rapport intime avec chiffrement AES-256-GCM
   */
  async logIntercourse(userId: string, dto: LogIntercourseDto): Promise<RapportSexuel> {
    let rapport = await this.rapportRepo.findOne({
      where: { utilisateurId: userId, date: dto.date },
    });

    const notesChiffrees = dto.notes !== undefined ? this.encryptionService.encrypt(dto.notes) : undefined;

    if (rapport) {
      rapport.typeRapport = dto.typeRapport;
      if (dto.heure !== undefined) rapport.heure = dto.heure;
      if (dto.contraceptionUrgence !== undefined) rapport.contraceptionUrgence = dto.contraceptionUrgence;
      if (notesChiffrees !== undefined) rapport.notesChiffrees = notesChiffrees;
      if (dto.idClientLocal !== undefined) rapport.idClientLocal = dto.idClientLocal;
    } else {
      rapport = this.rapportRepo.create({
        utilisateurId: userId,
        date: dto.date,
        typeRapport: dto.typeRapport,
        heure: dto.heure,
        contraceptionUrgence: dto.contraceptionUrgence ?? false,
        notesChiffrees: notesChiffrees || null,
        idClientLocal: dto.idClientLocal,
      });
    }

    const saved = await this.rapportRepo.save(rapport);
    saved.notes = dto.notes !== undefined ? dto.notes : (saved.notesChiffrees ? this.encryptionService.decrypt(saved.notesChiffrees) : null);
    return saved;
  }

  /**
   * UC-24 : Historique des rapports intimes avec déchiffrement applicatif
   */
  async getIntercourseHistory(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<RapportSexuel[]> {
    let dateFilter: any;
    if (startDate && endDate) {
      dateFilter = Between(startDate, endDate);
    } else if (startDate) {
      dateFilter = MoreThanOrEqual(startDate);
    } else if (endDate) {
      dateFilter = LessThanOrEqual(endDate);
    }

    const whereClause: any = { utilisateurId: userId };
    if (dateFilter) {
      whereClause.date = dateFilter;
    }

    const list = await this.rapportRepo.find({
      where: whereClause,
      order: { date: 'DESC' },
    });

    for (const item of list) {
      item.notes = item.notesChiffrees ? this.encryptionService.decrypt(item.notesChiffrees) : null;
    }

    return list;
  }

  /**
   * UC-24 : Suppression unitaire d'un rapport intime
   */
  async deleteIntercourse(userId: string, date: string): Promise<void> {
    await this.rapportRepo.delete({ utilisateurId: userId, date });
  }

  /**
   * Saisie globale journalière (UC-16 à UC-19 & UC-24 combinés)
   */
  async saveDayObservation(userId: string, dto: SaveDayObservationDto) {
    if (dto.temperature) {
      dto.temperature.date = dto.date;
      await this.logTemperature(userId, dto.temperature);
    }

    if (dto.glaire) {
      dto.glaire.date = dto.date;
      await this.logCervicalMucus(userId, dto.glaire);
    }

    if (dto.testLh) {
      dto.testLh.date = dto.date;
      await this.logLhTest(userId, dto.testLh);
    }

    if (dto.symptomes && dto.symptomes.length > 0) {
      await this.logSymptoms(userId, {
        date: dto.date,
        symptomes: dto.symptomes,
        idClientLocal: dto.idClientLocal,
      });
    }

    if (dto.rapport) {
      dto.rapport.date = dto.date;
      await this.logIntercourse(userId, dto.rapport);
    }

    return this.getDayObservations(userId, dto.date);
  }

  /**
   * UC-12 : Détail clinique complet d'un jour (BBT, glaire, LH, symptômes, rapports)
   */
  async getDayObservations(userId: string, date: string) {
    const [temperature, glaire, testsLh, symptomes, rapport] = await Promise.all([
      this.tempRepo.findOne({ where: { utilisateurId: userId, date } }),
      this.glaireRepo.findOne({ where: { utilisateurId: userId, date } }),
      this.lhRepo.find({
        where: { utilisateurId: userId, date },
        order: { heureTest: 'ASC' },
      }),
      this.obsSymptomeRepo.find({
        where: { utilisateurId: userId, date },
        relations: { typeSymptome: true },
      }),
      this.rapportRepo.findOne({ where: { utilisateurId: userId, date } }),
    ]);

    if (rapport) {
      rapport.notes = rapport.notesChiffrees ? this.encryptionService.decrypt(rapport.notesChiffrees) : null;
    }

    return {
      date,
      temperature,
      glaire,
      testsLh,
      symptomes,
      rapport,
    };
  }

  /**
   * Historique des observations sur une plage temporelle
   */
  async getObservationsHistory(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    let dateFilter: any;
    if (startDate && endDate) {
      dateFilter = Between(startDate, endDate);
    } else if (startDate) {
      dateFilter = MoreThanOrEqual(startDate);
    } else if (endDate) {
      dateFilter = LessThanOrEqual(endDate);
    }

    const whereClause: any = { utilisateurId: userId };
    if (dateFilter) {
      whereClause.date = dateFilter;
    }

    const [temperatures, glaires, testsLh, symptomes, rapports] = await Promise.all([
      this.tempRepo.find({ where: whereClause, order: { date: 'DESC' } }),
      this.glaireRepo.find({ where: whereClause, order: { date: 'DESC' } }),
      this.lhRepo.find({ where: whereClause, order: { date: 'DESC' } }),
      this.obsSymptomeRepo.find({
        where: whereClause,
        relations: { typeSymptome: true },
        order: { date: 'DESC' },
      }),
      this.rapportRepo.find({ where: whereClause, order: { date: 'DESC' } }),
    ]);

    for (const r of rapports) {
      r.notes = r.notesChiffrees ? this.encryptionService.decrypt(r.notesChiffrees) : null;
    }

    return {
      temperatures,
      glaires,
      testsLh,
      symptomes,
      rapports,
    };
  }

  /**
   * UC-16 DataViz : Analyse thermique symptothermique et détection biphasique
   */
  async getBbtAnalysis(userId: string, startDate?: string, endDate?: string) {
    let dateFilter: any;
    if (startDate && endDate) {
      dateFilter = Between(startDate, endDate);
    } else if (startDate) {
      dateFilter = MoreThanOrEqual(startDate);
    } else if (endDate) {
      dateFilter = LessThanOrEqual(endDate);
    }

    const whereClause: any = { utilisateurId: userId };
    if (dateFilter) {
      whereClause.date = dateFilter;
    }

    const [temperatures, glaires] = await Promise.all([
      this.tempRepo.find({ where: whereClause, order: { date: 'ASC' } }),
      this.glaireRepo.find({ where: whereClause, order: { date: 'ASC' } }),
    ]);

    const mucusByDate = new Map<string, string>();
    for (const g of glaires) {
      mucusByDate.set(g.date, g.typeGlaire);
    }

    // Convertir et valider les points
    const validPoints = temperatures
      .map((t) => {
        const tempVal = Number(t.temperatureCelsius);
        return {
          date: t.date,
          temperatureCelsius: tempVal,
          heurePrise: t.heurePrise || null,
          estPerturbee: !!t.estPerturbee,
          facteurPerturbateur: t.facteurPerturbateur || null,
          typeGlaire: mucusByDate.get(t.date) || null,
        };
      })
      .filter((p) => p.temperatureCelsius >= 34.0 && p.temperatureCelsius <= 42.0);

    if (validPoints.length < 3) {
      return {
        status: 'insufficient_data',
        message: 'Moins de 3 mesures enregistrées. Poursuivez vos prises quotidiennes le matin au réveil.',
        coverlineCelsius: null,
        shiftDetected: false,
        shiftDate: null,
        shiftDeltaCelsius: null,
        nadirDate: null,
        nadirTemperatureCelsius: null,
        follicularAvgCelsius: validPoints.length > 0 ? Number((validPoints.reduce((acc, p) => acc + p.temperatureCelsius, 0) / validPoints.length).toFixed(2)) : null,
        lutealAvgCelsius: null,
        lutealPhaseDays: 0,
        points: validPoints.map((p, idx) => ({ ...p, cycleDay: idx + 1, isAboveCoverline: false, phase: 'follicular' })),
      };
    }

    // Détection du décalage thermique (règle des 6 basses / 3 hautes selon Roetzer & OMS)
    let bestShiftIndex = -1;
    let coverline = 0;

    for (let i = 4; i < validPoints.length - 2; i++) {
      const priorNonPerturbed = validPoints.slice(Math.max(0, i - 6), i).filter((p) => !p.estPerturbee);
      if (priorNonPerturbed.length < 3) continue;

      const highestPrior = Math.max(...priorNonPerturbed.map((p) => p.temperatureCelsius));
      const testCoverline = Number((highestPrior + 0.05).toFixed(2));

      const high1 = validPoints[i];
      const high2 = validPoints[i + 1];
      const high3 = validPoints[i + 2];

      const h1Valid = !high1.estPerturbee && high1.temperatureCelsius >= highestPrior;
      const h2Valid = !high2.estPerturbee && high2.temperatureCelsius >= testCoverline;
      const h3Valid = !high3.estPerturbee && high3.temperatureCelsius >= highestPrior + 0.15;

      if (h1Valid && h2Valid && h3Valid) {
        bestShiftIndex = i;
        coverline = testCoverline;
        break;
      }
    }

    let potentialShift = false;
    let potentialShiftIndex = -1;
    if (bestShiftIndex === -1 && validPoints.length >= 4) {
      for (let i = validPoints.length - 2; i < validPoints.length; i++) {
        if (i < 3) continue;
        const prior = validPoints.slice(Math.max(0, i - 5), i).filter((p) => !p.estPerturbee);
        if (prior.length >= 3) {
          const maxPrior = Math.max(...prior.map((p) => p.temperatureCelsius));
          if (validPoints[i].temperatureCelsius >= maxPrior + 0.15) {
            potentialShift = true;
            potentialShiftIndex = i;
            coverline = Number((maxPrior + 0.05).toFixed(2));
            break;
          }
        }
      }
    }

    let status = 'follicular_phase';
    let message = 'Courbe en plateau folliculaire (bas). La progestérone n’a pas encore amorcé de hausse thermique.';
    let shiftDate: string | null = null;
    let shiftDeltaCelsius: number | null = null;
    let nadirDate: string | null = null;
    let nadirTemp: number | null = null;
    let lutealAvg: number | null = null;
    let follicularAvg: number | null = null;
    let lutealDays = 0;

    if (bestShiftIndex !== -1) {
      status = 'biphasic_confirmed';
      shiftDate = validPoints[bestShiftIndex].date;

      const nadirCandidates = validPoints.slice(Math.max(0, bestShiftIndex - 2), bestShiftIndex);
      if (nadirCandidates.length > 0) {
        const nadirPoint = nadirCandidates.reduce((min, p) => p.temperatureCelsius < min.temperatureCelsius ? p : min);
        nadirDate = nadirPoint.date;
        nadirTemp = nadirPoint.temperatureCelsius;
      }

      const follicularPoints = validPoints.slice(0, bestShiftIndex);
      const lutealPoints = validPoints.slice(bestShiftIndex);

      follicularAvg = Number((follicularPoints.reduce((acc, p) => acc + p.temperatureCelsius, 0) / (follicularPoints.length || 1)).toFixed(2));
      lutealAvg = Number((lutealPoints.reduce((acc, p) => acc + p.temperatureCelsius, 0) / (lutealPoints.length || 1)).toFixed(2));
      shiftDeltaCelsius = Number((lutealAvg - follicularAvg).toFixed(2));
      lutealDays = lutealPoints.filter((p) => p.temperatureCelsius >= coverline).length;

      message = `Courbe biphasique confirmée ! Décalage thermique net de +${shiftDeltaCelsius} °C détecté à partir du ${shiftDate}. Ovulation confirmée par progestérone.`;
    } else if (potentialShift) {
      status = 'potential_shift';
      shiftDate = validPoints[potentialShiftIndex].date;
      message = 'Décalage thermique en cours de confirmation. Une 3ème température haute validera le plateau lutéal.';
      const folPoints = validPoints.slice(0, potentialShiftIndex);
      follicularAvg = Number((folPoints.reduce((acc, p) => acc + p.temperatureCelsius, 0) / (folPoints.length || 1)).toFixed(2));
    } else {
      follicularAvg = Number((validPoints.reduce((acc, p) => acc + p.temperatureCelsius, 0) / validPoints.length).toFixed(2));
      if (validPoints.length >= 21) {
        status = 'monophasic_suspected';
        message = 'Aucune hausse thermique nette au-delà de 21 jours. Cycle potentiellement anovulatoire ou mesures perturbées.';
      }
    }

    const annotatedPoints = validPoints.map((p, idx) => ({
      ...p,
      cycleDay: idx + 1,
      isAboveCoverline: coverline > 0 ? p.temperatureCelsius >= coverline : false,
      phase: bestShiftIndex !== -1
        ? (idx >= bestShiftIndex ? 'luteal' : 'follicular')
        : (potentialShift && idx >= potentialShiftIndex ? 'potential_luteal' : 'follicular'),
    }));

    return {
      status,
      message,
      coverlineCelsius: coverline > 0 ? coverline : null,
      shiftDetected: bestShiftIndex !== -1,
      shiftDate,
      shiftDeltaCelsius,
      nadirDate,
      nadirTemperatureCelsius: nadirTemp,
      follicularAvgCelsius: follicularAvg,
      lutealAvgCelsius: lutealAvg,
      lutealPhaseDays: lutealDays,
      points: annotatedPoints,
    };
  }

  /**
   * Suppressions unitaires
   */
  async deleteTemperature(userId: string, date: string): Promise<void> {
    await this.tempRepo.delete({ utilisateurId: userId, date });
  }

  async deleteCervicalMucus(userId: string, date: string): Promise<void> {
    await this.glaireRepo.delete({ utilisateurId: userId, date });
  }

  async deleteLhTest(userId: string, id: string): Promise<void> {
    const test = await this.lhRepo.findOne({ where: { id, utilisateurId: userId } });
    if (!test) throw new NotFoundException('Test LH introuvable');
    await this.lhRepo.delete(id);
  }

  async deleteSymptom(userId: string, id: string): Promise<void> {
    const obs = await this.obsSymptomeRepo.findOne({ where: { id, utilisateurId: userId } });
    if (!obs) throw new NotFoundException('Observation symptôme introuvable');
    await this.obsSymptomeRepo.delete(id);
  }

  /**
   * UC-Sync : Traitement par lot d'une file d'attente hors-ligne
   * et récupération bidirectionnelle des mises à jour serveur
   */
  async syncBatch(
    userId: string,
    dto: {
      mutations?: SaveDayObservationDto[];
      deletions?: { type: 'temperature' | 'cervical-mucus' | 'lh-test' | 'symptoms' | 'intercourse'; date?: string; id?: string }[];
      since?: string;
    },
  ) {
    const results: any[] = [];

    // 1. Appliquer les mutations (Upsert)
    if (dto.mutations && dto.mutations.length > 0) {
      for (const m of dto.mutations) {
        try {
          const savedDay = await this.saveDayObservation(userId, m);
          results.push(savedDay);
        } catch (err) {
          this.logger.warn(`Échec synchronisation jour ${m.date}: ${err?.message || err}`);
        }
      }
    }

    // 2. Appliquer les suppressions
    if (dto.deletions && dto.deletions.length > 0) {
      for (const del of dto.deletions) {
        try {
          if (del.type === 'temperature' && del.date) {
            await this.deleteTemperature(userId, del.date);
          } else if (del.type === 'cervical-mucus' && del.date) {
            await this.deleteCervicalMucus(userId, del.date);
          } else if (del.type === 'lh-test' && del.id) {
            await this.deleteLhTest(userId, del.id);
          } else if (del.type === 'symptoms' && del.id) {
            await this.deleteSymptom(userId, del.id);
          } else if (del.type === 'intercourse' && del.date) {
            await this.deleteIntercourse(userId, del.date);
          }
        } catch (err) {
          this.logger.warn(`Échec suppression sync: ${err?.message || err}`);
        }
      }
    }

    // 3. Récupérer les modifications serveur depuis 'since' pour la bidirectionnalité
    const serverChanges = dto.since
      ? await this.getObservationsHistory(userId, dto.since.substring(0, 10))
      : null;

    return {
      syncedAt: new Date().toISOString(),
      syncedDaysCount: results.length,
      syncedDays: results,
      serverChanges,
    };
  }
}

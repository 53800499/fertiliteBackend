import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { Utilisateur, StatutCompteEnum } from './entities/utilisateur.entity';
import { ProfilUtilisateur } from './entities/profil-utilisateur.entity';
import { SessionAuthentification } from '../auth/entities/session-authentification.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepo: Repository<Utilisateur>,
    @InjectRepository(ProfilUtilisateur)
    private readonly profilRepo: Repository<ProfilUtilisateur>,
    @InjectRepository(SessionAuthentification)
    private readonly sessionRepo: Repository<SessionAuthentification>,
  ) {}

  /**
   * UC-04 : Consultation du profil utilisateur
   */
  async getProfile(userId: string) {
    const user = await this.utilisateurRepo.findOne({
      where: { id: userId },
      relations: { profil: true, parametresConfidentialite: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisatrice introuvable');
    }

    return {
      id: user.id,
      email: user.email,
      dateNaissance: user.dateNaissance,
      languePreferee: user.languePreferee,
      fuseauHoraire: user.fuseauHoraire,
      dateCreation: user.dateCreation,
      profil: user.profil,
      parametresConfidentialite: user.parametresConfidentialite,
    };
  }

  /**
   * UC-04 : Mise à jour du profil déclaratif
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    let profil = await this.profilRepo.findOne({ where: { utilisateurId: userId } });
    if (!profil) {
      profil = this.profilRepo.create({ utilisateurId: userId });
    }

    if (dto.prenom !== undefined) profil.prenom = dto.prenom;
    if (dto.objectifPrincipal !== undefined) profil.objectifPrincipal = dto.objectifPrincipal;
    if (dto.dureeCycleHabituelleJours !== undefined) {
      profil.dureeCycleHabituelleJours = dto.dureeCycleHabituelleJours;
    } else if (dto.dureeMoyenneCycle !== undefined) {
      profil.dureeCycleHabituelleJours = dto.dureeMoyenneCycle;
    }

    if (dto.dureeReglesHabituelleJours !== undefined) {
      profil.dureeReglesHabituelleJours = dto.dureeReglesHabituelleJours;
    } else if (dto.dureeMoyenneRegles !== undefined) {
      profil.dureeReglesHabituelleJours = dto.dureeMoyenneRegles;
    }

    if (dto.irregulariteDeclaree !== undefined) {
      profil.irregulariteDeclaree = dto.irregulariteDeclaree;
    }
    if (dto.dateDernieresReglesConnues !== undefined) {
      profil.dateDernieresReglesConnues = dto.dateDernieresReglesConnues;
    }

    await this.profilRepo.save(profil);
    return this.getProfile(userId);
  }

  /**
   * UC-06 : Demande de suppression de compte (Soft Delete)
   */
  async requestAccountDeletion(userId: string, dto: DeleteAccountDto) {
    const user = await this.utilisateurRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisatrice introuvable');
    }

    // Vérification stricte du mot de passe
    const isPasswordValid = await argon2.verify(user.motDePasseHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe de confirmation incorrect');
    }

    // Soft delete immédiat
    user.statutCompte = StatutCompteEnum.SUPPRIME;
    user.dateSuppressionDemandee = new Date();
    await this.utilisateurRepo.save(user);

    // Révocation de toutes les sessions actives existantes
    await this.sessionRepo.update(
      { utilisateurId: userId },
      { revoque: true },
    );

    return {
      success: true,
      message:
        'Votre compte a été désactivé. Vos données seront définitivement purgées à l’issue du délai de grâce de 30 jours.',
    };
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Utilisateur } from './entities/utilisateur.entity';
import { ProfilUtilisateur } from './entities/profil-utilisateur.entity';
import { SessionAuthentification } from '../auth/entities/session-authentification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Utilisateur,
      ProfilUtilisateur,
      SessionAuthentification,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

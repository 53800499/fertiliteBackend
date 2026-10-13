import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cycle } from './entities/cycle.entity';
import { JourRegles } from './entities/jour-regles.entity';
import { CyclesService } from './cycles.service';
import { CyclesController } from './cycles.controller';
import { FertilityModule } from '../fertility/fertility.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cycle, JourRegles]),
    forwardRef(() => FertilityModule),
  ],
  controllers: [CyclesController],
  providers: [CyclesService],
  exports: [CyclesService],
})
export class CyclesModule {}

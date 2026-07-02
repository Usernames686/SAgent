import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbExperimentEntity } from '../../../entities/ab-experiment.entity';
import { EvolutionEventEntity } from '../../../entities/evolution-event.entity';
import { StrategyVariantEntity } from '../../../entities/strategy-variant.entity';
import { Submission } from '../../../entities/submission.entity';
import { KnowledgePoint } from '../../../entities/knowledge-point.entity';
import { EvolutionService } from './evolution.service';
import { EvolutionController } from './evolution.controller';
import { EvolutionEngineService } from './evolution-engine.service';
import { AbTestService } from './ab-test.service';
import { EvolutionDataCollector } from './evolution-data-collector.service';
import { BehaviorModule } from '../../behavior/behavior.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AbExperimentEntity,
      EvolutionEventEntity,
      StrategyVariantEntity,
      Submission,
      KnowledgePoint,
    ]),
    BehaviorModule,
  ],
  controllers: [EvolutionController],
  providers: [EvolutionService, EvolutionEngineService, AbTestService, EvolutionDataCollector],
  exports: [EvolutionService, EvolutionEngineService, AbTestService, EvolutionDataCollector],
})
export class EvolutionModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from '../../entities/exercise.entity';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { Submission } from '../../entities/submission.entity';
import { ExerciseService } from './exercise.service';
import { ExerciseController } from './exercise.controller';
import { SandboxModule } from '../sandbox/sandbox.module';
import { KnowledgePointModule } from '../knowledge-point/knowledge-point.module';

@Module({
  imports: [TypeOrmModule.forFeature([Exercise, Submission, KnowledgePoint]), SandboxModule, KnowledgePointModule],
  controllers: [ExerciseController],
  providers: [ExerciseService],
  exports: [ExerciseService],
})
export class ExerciseModule {}

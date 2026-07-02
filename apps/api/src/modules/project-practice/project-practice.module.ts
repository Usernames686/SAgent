import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { KnowledgePointModule } from '../knowledge-point/knowledge-point.module';
import { ProjectPracticeController } from './project-practice.controller';
import { ProjectPracticeService } from './project-practice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgePoint, LearningProgress]),
    KnowledgePointModule,
  ],
  controllers: [ProjectPracticeController],
  providers: [ProjectPracticeService],
})
export class ProjectPracticeModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningPath } from '../../entities/learning-path.entity';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { LearningPathService } from './learning-path.service';
import { LearningPathController } from './learning-path.controller';
import { KnowledgeGraphAgent } from '../agent/agents/knowledge-graph.agent';

@Module({
  imports: [TypeOrmModule.forFeature([LearningPath, KnowledgePoint])],
  controllers: [LearningPathController],
  providers: [LearningPathService, KnowledgeGraphAgent],
  exports: [LearningPathService],
})
export class LearningPathModule {}

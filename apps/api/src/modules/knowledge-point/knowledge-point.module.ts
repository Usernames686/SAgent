import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { ContentItemEntity } from '../../entities/content-item.entity';
import { KnowledgeRelationEntity } from '../../entities/knowledge-relation.entity';
import { ContentVersionEntity } from '../../entities/content-version.entity';
import { KnowledgePointService } from './knowledge-point.service';
import { KnowledgePointController } from './knowledge-point.controller';
import { KnowledgeSeedService } from './knowledge-seed.service';
import { ContentManagementService } from './content-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgePoint,
      ContentItemEntity,
      KnowledgeRelationEntity,
      ContentVersionEntity,
    ]),
  ],
  controllers: [KnowledgePointController],
  providers: [KnowledgePointService, KnowledgeSeedService, ContentManagementService],
  exports: [KnowledgePointService, KnowledgeSeedService, ContentManagementService],
})
export class KnowledgePointModule {}

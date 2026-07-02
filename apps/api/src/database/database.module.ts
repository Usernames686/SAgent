import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { KnowledgePoint } from '../entities/knowledge-point.entity';
import { Exercise } from '../entities/exercise.entity';
import { Submission } from '../entities/submission.entity';
import { LearningPath } from '../entities/learning-path.entity';
import { AiSession } from '../entities/ai-session.entity';
import { ContentItemEntity } from '../entities/content-item.entity';
import { KnowledgeRelationEntity } from '../entities/knowledge-relation.entity';
import { ContentVersionEntity } from '../entities/content-version.entity';
import { AbExperimentEntity } from '../entities/ab-experiment.entity';
import { EvolutionEventEntity } from '../entities/evolution-event.entity';
import { StrategyVariantEntity } from '../entities/strategy-variant.entity';
import { Badge } from '../entities/badge.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { BrowseHistory } from '../entities/browse-history.entity';
import { CommunityPost } from '../entities/community-post.entity';
import { CommunityComment } from '../entities/community-comment.entity';
import { LearningProgress } from '../entities/learning-progress.entity';
import { ErrorReview } from '../entities/error-review.entity';
import { BehaviorEventEntity } from '../entities/behavior-event.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: './data/sagent.db',
      entities: [
        User,
        UserProfile,
        KnowledgePoint,
        Exercise,
        Submission,
        LearningPath,
        AiSession,
        ContentItemEntity,
        KnowledgeRelationEntity,
        ContentVersionEntity,
        AbExperimentEntity,
        EvolutionEventEntity,
        StrategyVariantEntity,
        Badge,
        UserBadge,
        Bookmark,
        BrowseHistory,
        CommunityPost,
        CommunityComment,
        LearningProgress,
        ErrorReview,
        BehaviorEventEntity,
      ],
      // 仅在开发环境且首次启动（无 DB 文件）时自动同步表结构，否则关闭以加速启动
      synchronize: process.env.NODE_ENV !== 'production' && !require('fs').existsSync('./data/sagent.db'),
      // 开发环境只打印 error/warn，生产环境关闭
      logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Submission } from '../../entities/submission.entity';
import { UserBadge } from '../../entities/user-badge.entity';
import { BrowseHistory } from '../../entities/browse-history.entity';
import { BehaviorEventEntity } from '../../entities/behavior-event.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { BehaviorModule } from '../behavior/behavior.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Submission, UserBadge, BrowseHistory, BehaviorEventEntity]),
    BehaviorModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

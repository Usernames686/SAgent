import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExerciseModule } from './modules/exercise/exercise.module';
import { LearningPathModule } from './modules/learning-path/learning-path.module';
import { AgentModule } from './modules/agent/agent.module';
import { KnowledgePointModule } from './modules/knowledge-point/knowledge-point.module';
import { AiSessionModule } from './modules/ai-session/ai-session.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { PreviewModule } from './modules/agent/preview/preview.module';
import { EvolutionModule } from './modules/agent/evolution/evolution.module';
import { VibeLearningModule } from './modules/vibe-learning/vibe-learning.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { SandboxModule } from './modules/sandbox/sandbox.module';
import { BadgeModule } from './modules/badge/badge.module';
import { BookmarkModule } from './modules/bookmark/bookmark.module';
import { HistoryModule } from './modules/history/history.module';
import { CommunityModule } from './modules/community/community.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BehaviorModule } from './modules/behavior/behavior.module';
import { ResearchModule } from './modules/research/research.module';
import { DatasetModule } from './modules/dataset/dataset.module';
import { ProjectPracticeModule } from './modules/project-practice/project-practice.module';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppWebSocketGateway } from './common/websocket.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 限流配置：全局每分钟 120 次请求
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },      // 短窗口：1 秒 10 次
      { name: 'medium', ttl: 10000, limit: 30 },     // 中窗口：10 秒 30 次
      { name: 'long', ttl: 60000, limit: 120 },      // 长窗口：1 分钟 120 次
    ]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UserModule,
    ExerciseModule,
    LearningPathModule,
    KnowledgePointModule,
    AgentModule,
    AiSessionModule,
    PreviewModule,
    EvolutionModule,
    VibeLearningModule,
    AssessmentModule,
    SandboxModule,
    BadgeModule,
    BookmarkModule,
    HistoryModule,
    CommunityModule,
    AnalyticsModule,
    BehaviorModule,
    ResearchModule,
    DatasetModule,
    ProjectPracticeModule,
  ],
  providers: [
    AppWebSocketGateway,
    // 全局限流 Guard
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    // 全局角色 Guard（配合 @Roles() 装饰器）
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSession } from '../../entities/ai-session.entity';
import { Exercise } from '../../entities/exercise.entity';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { LearningPath } from '../../entities/learning-path.entity';
import { Submission } from '../../entities/submission.entity';
import { User } from '../../entities/user.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { AiSessionModule } from '../ai-session/ai-session.module';
import { AgentModule } from '../agent/agent.module';
import { KnowledgePointModule } from '../knowledge-point/knowledge-point.module';
import { VibeLearningController, KnowledgePointLearningController } from './vibe-learning.controller';
import { VibeLearningService } from './vibe-learning.service';
import { LearningSessionService } from './learning-session.service';
import { KnowledgeQueryService } from './knowledge-query.service';
import { AdaptiveLearningEngine } from './adaptive-learning.engine';
import { TeachingAgentCollaborator } from './teaching-agent-collaborator';
import { LearningPathEngine } from './learning-path.engine';
import { CodeSandboxService } from './code-sandbox.service';
import { TestRunnerService } from './test-runner.service';
import { AiReviewEngine } from './ai-review.engine';
import { ExerciseScoringService } from './exercise-scoring.service';
import { VibeCodingLabService } from './vibe-coding-lab.service';
import { BugChallengeService } from './bug-challenge.service';
import { ReviewChallengeService } from './review-challenge.service';
import { LearningProgressService } from './learning-progress.service';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { ErrorReviewService } from './error-review.service';
import { LearningAdvisorService } from './learning-advisor.service';
import { ErrorReview } from '../../entities/error-review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgePoint, Exercise, User, UserProfile, LearningPath, AiSession, Submission, LearningProgress, ErrorReview]),
    KnowledgePointModule,
    AiSessionModule,
    AgentModule,
  ],
  controllers: [VibeLearningController, KnowledgePointLearningController],
  providers: [
    VibeLearningService,
    LearningSessionService,
    KnowledgeQueryService,
    AdaptiveLearningEngine,
    TeachingAgentCollaborator,
    LearningPathEngine,
    // Phase 3: 4级验证体系
    CodeSandboxService,
    TestRunnerService,
    AiReviewEngine,
    ExerciseScoringService,
    // Phase 4: Vibe Coding 特色学习模式
    VibeCodingLabService,
    BugChallengeService,
    ReviewChallengeService,
    // Phase 5: 学习进度
    LearningProgressService,
    SpacedRepetitionService,
    ErrorReviewService,
    LearningAdvisorService,
  ],
  exports: [VibeLearningService, LearningSessionService, KnowledgeQueryService, AdaptiveLearningEngine, TeachingAgentCollaborator, LearningPathEngine, ExerciseScoringService, CodeSandboxService, LearningProgressService, SpacedRepetitionService, ErrorReviewService, LearningAdvisorService],
})
export class VibeLearningModule {}

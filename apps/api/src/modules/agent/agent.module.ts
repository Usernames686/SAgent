import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { OrchestratorAgent } from './agents/orchestrator.agent';
import { TutorAgent } from './agents/tutor.agent';
import { EvaluatorAgent } from './agents/evaluator.agent';
import { DebugAgent } from './agents/debug.agent';
import { CodeReviewAgent } from './agents/code-review.agent';
import { LlmGateway } from './llm/llm.gateway';
import { AgentOrchestrator } from './acp/agent-orchestrator';
import { AiSessionModule } from '../ai-session/ai-session.module';

@Module({
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentOrchestrator,
    OrchestratorAgent,
    TutorAgent,
    EvaluatorAgent,
    DebugAgent,
    CodeReviewAgent,
    LlmGateway,
  ],
  exports: [AgentService, AgentOrchestrator, LlmGateway],
})
export class AgentModule {}

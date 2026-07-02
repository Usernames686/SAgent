export interface AgentMessage {
    protocol: 'ACP/1.0';
    message: {
        id: string;
        from: string;
        to: string;
        type: 'request' | 'response' | 'event' | 'error';
        timestamp: string;
        correlationId: string;
        payload: {
            action: string;
            parameters: Record<string, unknown>;
            context: AgentContext;
        };
        metadata: AgentMetadata;
    };
}
export interface AgentContext {
    userId: string;
    sessionId: string;
    userLevel: string;
    currentCode?: string;
    knowledgeState?: Record<string, number>;
}
export interface AgentMetadata {
    priority: 'high' | 'medium' | 'low';
    timeout: number;
    retryPolicy: {
        maxRetries: number;
        backoffMs: number;
    };
}
export type AgentType = 'orchestrator' | 'tutor' | 'evaluator' | 'path_planner' | 'debug' | 'code_review' | 'knowledge_graph' | 'interview' | 'mentor' | 'evolution';
export interface AgentConfig {
    type: AgentType;
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    timeout: number;
}
export interface AgentResponse {
    agentType: AgentType;
    content: string;
    metadata: {
        tokens: number;
        latencyMs: number;
        confidence: number;
    };
}

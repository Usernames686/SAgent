import { Injectable, Logger } from '@nestjs/common';
import { KnowledgePoint } from '../../../entities/knowledge-point.entity';

// 知识点关联关系
export interface KnowledgeRelation {
  sourceId: string;
  targetId: string;
  type: 'prerequisite' | 'related' | 'advanced' | 'application' | 'comparison' | 'protection';
  weight: number;  // 0-1
}

// 学习缺口
export interface KnowledgeGap {
  knowledgePointId: string;
  name: string;
  domain: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

// 图谱可视化
export interface GraphVisualization {
  nodes: { id: string; name: string; domain: string; module: string; difficulty: number; masteryProb?: number }[];
  edges: { source: string; target: string; type: string; weight: number }[];
}

// 内存中的知识点样本（在没有数据库时使用）
const DEFAULT_KNOWLEDGE_POINTS: Partial<KnowledgePoint>[] = [
  { nodeId: 'vc-cognition-001', name: 'Vibe Coding 范式理解', domain: 'vibe_coding', module: 'cognition', difficulty: 1, prerequisites: [], dependents: ['vc-cognition-002'], skills: ['vibe_coding'], status: 'published' },
  { nodeId: 'vc-cognition-002', name: '氛围抽象能力', domain: 'vibe_coding', module: 'cognition', difficulty: 2, prerequisites: ['vc-cognition-001'], dependents: ['vc-prompt-001'], skills: ['vibe_coding'], status: 'published' },
  { nodeId: 'vc-cognition-003', name: '产品化思维', domain: 'vibe_coding', module: 'cognition', difficulty: 2, prerequisites: ['vc-cognition-002'], dependents: [], skills: ['vibe_coding', 'product'], status: 'published' },
  { nodeId: 'vc-tools-001', name: 'AI IDE 使用', domain: 'vibe_coding', module: 'tools', difficulty: 1, prerequisites: [], dependents: ['vc-tools-002'], skills: ['tools'], status: 'published' },
  { nodeId: 'vc-tools-002', name: 'Git 版本控制', domain: 'vibe_coding', module: 'tools', difficulty: 2, prerequisites: ['vc-tools-001'], dependents: [], skills: ['tools', 'git'], status: 'published' },
  { nodeId: 'vc-prompt-001', name: '基础 Prompt 结构', domain: 'vibe_coding', module: 'prompt', difficulty: 1, prerequisites: ['vc-cognition-002'], dependents: ['vc-prompt-002'], skills: ['prompt'], status: 'published' },
  { nodeId: 'vc-prompt-002', name: '高级 Prompt 技巧', domain: 'vibe_coding', module: 'prompt', difficulty: 3, prerequisites: ['vc-prompt-001'], dependents: ['vc-prompt-003'], skills: ['prompt'], status: 'published' },
  { nodeId: 'vc-prompt-003', name: '场景化 Prompt 模板', domain: 'vibe_coding', module: 'prompt', difficulty: 3, prerequisites: ['vc-prompt-002'], dependents: [], skills: ['prompt'], status: 'published' },
  { nodeId: 'vc-code-001', name: '前端基础（HTML/CSS/JS）', domain: 'vibe_coding', module: 'code', difficulty: 1, prerequisites: [], dependents: ['vc-code-002'], skills: ['frontend'], status: 'published' },
  { nodeId: 'vc-code-002', name: 'React 框架基础', domain: 'vibe_coding', module: 'code', difficulty: 2, prerequisites: ['vc-code-001'], dependents: [], skills: ['frontend', 'react'], status: 'published' },
];

@Injectable()
export class KnowledgeGraphAgent {
  private readonly logger = new Logger(KnowledgeGraphAgent.name);

  constructor() {}

  /**
   * 获取知识点（优先使用数据库，回退到内存样本）
   */
  private async getKnowledgePoints(): Promise<Partial<KnowledgePoint>[]> {
    return DEFAULT_KNOWLEDGE_POINTS;
  }

  /**
   * 识别知识缺口
   */
  async identifyGaps(
    masteredIds: string[],
    targetRole?: string,
  ): Promise<KnowledgeGap[]> {
    const allKps = await this.getKnowledgePoints();
    const masteredSet = new Set(masteredIds);
    const gaps: KnowledgeGap[] = [];

    for (const kp of allKps) {
      if (!kp.nodeId || masteredSet.has(kp.nodeId)) continue;

      const unmetPrereqs = (kp.prerequisites || []).filter(preId => !masteredSet.has(preId));
      if (unmetPrereqs.length > 0) continue;

      let priority: 'high' | 'medium' | 'low' = 'medium';
      const reason: string[] = [];

      const dependents = allKps.filter(k => (k.prerequisites || []).includes(kp.nodeId!));
      if (dependents.length > 0) {
        priority = 'high';
        reason.push(`${dependents.length} 个后续知识点依赖此知识`);
      }

      if (targetRole && (kp.skills || []).some(s => targetRole.includes(s))) {
        priority = 'high';
        reason.push('与目标岗位相关');
      }

      if (reason.length === 0) {
        reason.push('建议按路径顺序学习');
      }

      gaps.push({
        knowledgePointId: kp.nodeId,
        name: kp.name || kp.nodeId,
        domain: kp.domain || '',
        priority,
        reason: reason.join('；'),
      });
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * 获取知识图谱可视化数据
   */
  async getVisualization(
    knowledgePointIds?: string[],
    knowledgeState?: Record<string, number>,
  ): Promise<GraphVisualization> {
    let kps = await this.getKnowledgePoints();

    if (knowledgePointIds && knowledgePointIds.length > 0) {
      kps = kps.filter(k => k.nodeId && knowledgePointIds.includes(k.nodeId));
    }

    const nodes: GraphVisualization['nodes'] = kps.map(kp => ({
      id: kp.nodeId || '',
      name: kp.name || '',
      domain: kp.domain || '',
      module: kp.module || '',
      difficulty: kp.difficulty || 1,
      masteryProb: knowledgeState?.[kp.nodeId || ''],
    }));

    const edges: GraphVisualization['edges'] = [];
    const edgeSet = new Set<string>();

    for (const kp of kps) {
      for (const preId of kp.prerequisites || []) {
        const key = `${preId}->${kp.nodeId}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ source: preId, target: kp.nodeId || '', type: 'prerequisite', weight: 1 });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * 前置知识检测
   */
  async checkPrerequisites(
    knowledgePointId: string,
    masteredIds: string[],
  ): Promise<{ met: boolean; unmetPrereqs: string[] }> {
    const kps = await this.getKnowledgePoints();
    const kp = kps.find(k => k.nodeId === knowledgePointId);
    if (!kp) return { met: true, unmetPrereqs: [] };

    const masteredSet = new Set(masteredIds);
    const unmetPrereqs = (kp.prerequisites || []).filter(preId => !masteredSet.has(preId));

    return {
      met: unmetPrereqs.length === 0,
      unmetPrereqs,
    };
  }

  /**
   * 获取推荐学习序列（基于知识图谱拓扑排序）
   */
  async getRecommendedSequence(
    domain: string,
    limit: number = 20,
  ): Promise<Partial<KnowledgePoint>[]> {
    const kps = (await this.getKnowledgePoints())
      .filter(k => k.domain === domain && k.status === 'published')
      .sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1));

    const visited = new Set<string>();
    const sequence: Partial<KnowledgePoint>[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const kp = kps.find(k => k.nodeId === nodeId);
      if (!kp) return;

      for (const preId of kp.prerequisites || []) {
        visit(preId);
      }

      sequence.push(kp);
    };

    for (const kp of kps) {
      if (kp.nodeId) visit(kp.nodeId);
    }

    return sequence.slice(0, limit);
  }
}

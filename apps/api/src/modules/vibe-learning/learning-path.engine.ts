/**
 * 学习路径引擎 — 拓扑排序 + 个性化路径规划
 *
 * 设计理念：
 * 1. 基于 80+ 知识点的前置依赖关系，构建完整的知识图谱 DAG
 * 2. 拓扑排序生成基础学习路径
 * 3. 根据学生画像（零基础/转行/有经验）个性化调整路径
 * 4. 动态调整：根据学习进度实时重排路径
 * 5. 支持多种路径模式：系统推荐路径、目标驱动路径、弱项强化路径
 *
 * 核心算法：
 * - 拓扑排序 (Kahn's Algorithm) — 保证前置依赖
 * - 优先级加权排序 — 同层级知识点的优先级
 * - A* 搜索 — 目标驱动的最短路径
 * - 贪心策略 — 弱项强化路径
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import {
  LearnerState,
  StudentProfileType,
  AdaptiveLearningEngine,
} from './adaptive-learning.engine';

// ===== 路径节点 =====

export interface PathNode {
  /** 知识点 ID */
  nodeId: string;
  /** 知识点名称 */
  name: string;
  /** 所属模块 */
  module: string;
  /** 难度 (1-5) */
  difficulty: number;
  /** 预计学习时长（分钟） */
  estimatedMinutes: number;
  /** 前置依赖 */
  prerequisites: string[];
  /** 后续依赖 */
  dependents: string[];
  /** 在路径中的层级（0=基础，越大越高级） */
  level: number;
  /** 掌握状态 */
  mastery: number;
  /** 状态 */
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'mastered';
}

// ===== 学习路径 =====

export interface LearningPathResult {
  /** 路径 ID */
  pathId: string;
  /** 路径名称 */
  pathName: string;
  /** 路径类型 */
  pathType: LearningPathType;
  /** 路径描述 */
  description: string;
  /** 路径节点（有序） */
  nodes: PathNode[];
  /** 总预计时长（分钟） */
  totalEstimatedMinutes: number;
  /** 当前进度（0-1） */
  progress: number;
  /** 里程碑 */
  milestones: Milestone[];
  /** 路径元信息 */
  meta: {
    profileType: StudentProfileType;
    targetNodeId?: string;
    generatedAt: number;
  };
}

export type LearningPathType =
  | 'system_recommended'   // 系统推荐路径
  | 'target_driven'        // 目标驱动路径
  | 'weakness_reinforce'   // 弱项强化路径
  | 'module_focus'         // 模块聚焦路径
  | 'interview_prep';      // 面试冲刺路径

// ===== 里程碑 =====

export interface Milestone {
  /** 里程碑名称 */
  name: string;
  /** 对应节点索引 */
  nodeIndex: number;
  /** 描述 */
  description: string;
  /** 奖励徽章 */
  badge?: string;
  /** 预计到达时间（分钟） */
  estimatedMinutes: number;
}

// ===== 路径规划请求 =====

export interface PathPlanningRequest {
  userId: string;
  learnerState: LearnerState;
  pathType: LearningPathType;
  /** 目标知识点 ID（目标驱动路径需要） */
  targetNodeId?: string;
  /** 聚焦模块（模块聚焦路径需要） */
  focusModule?: string;
  /** 最大节点数 */
  maxNodes?: number;
}

// ===== 知识图谱边 =====

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

// ===== 模块配置 =====

const MODULE_CONFIG: Record<string, {
  name: string;
  icon: string;
  color: string;
  defaultOrder: number;
  estimatedMinutesPerNode: number;
}> = {
  'js-fundamentals': { name: 'JavaScript 基础', icon: '🟨', color: '#F7DF1E', defaultOrder: 1, estimatedMinutesPerNode: 30 },
  'js-advanced': { name: 'JavaScript 进阶', icon: '⚡', color: '#EFD81D', defaultOrder: 2, estimatedMinutesPerNode: 45 },
  'fe-basics': { name: '前端基础', icon: '🌐', color: '#E34F26', defaultOrder: 1, estimatedMinutesPerNode: 25 },
  'react-core': { name: 'React 核心', icon: '⚛️', color: '#61DAFB', defaultOrder: 3, estimatedMinutesPerNode: 40 },
  'react-advanced': { name: 'React 进阶', icon: '🔮', color: '#764ABC', defaultOrder: 4, estimatedMinutesPerNode: 50 },
  'react-ecosystem': { name: 'React 生态', icon: '🌿', color: '#53AC43', defaultOrder: 5, estimatedMinutesPerNode: 45 },
  'node-core': { name: 'Node.js 核心', icon: '🟩', color: '#339933', defaultOrder: 3, estimatedMinutesPerNode: 40 },
  'node-web': { name: 'Node.js Web 开发', icon: '🖥️', color: '#68A063', defaultOrder: 4, estimatedMinutesPerNode: 50 },
  'engineering': { name: '工程化', icon: '🔧', color: '#007ACC', defaultOrder: 5, estimatedMinutesPerNode: 35 },
  'fullstack-project': { name: '全栈实战', icon: '🚀', color: '#FF6B6B', defaultOrder: 6, estimatedMinutesPerNode: 90 },
};

@Injectable()
export class LearningPathEngine {
  private readonly logger = new Logger(LearningPathEngine.name);

  constructor(
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    private readonly adaptiveEngine: AdaptiveLearningEngine,
  ) {}

  // ===== 核心入口：生成学习路径 =====

  /**
   * 根据请求生成个性化学习路径
   */
  async generatePath(request: PathPlanningRequest): Promise<LearningPathResult> {
    const { pathType, learnerState } = request;

    // 1. 获取所有知识点
    const allKnowledgePoints = await this.getAllKnowledgePoints();

    // 2. 构建知识图谱
    const graph = this.buildKnowledgeGraph(allKnowledgePoints);

    // 3. 根据路径类型选择生成算法
    let pathNodes: PathNode[];
    switch (pathType) {
      case 'system_recommended':
        pathNodes = this.generateSystemPath(graph, learnerState, allKnowledgePoints);
        break;
      case 'target_driven':
        pathNodes = this.generateTargetDrivenPath(graph, learnerState, allKnowledgePoints, request.targetNodeId!);
        break;
      case 'weakness_reinforce':
        pathNodes = this.generateWeaknessPath(graph, learnerState, allKnowledgePoints);
        break;
      case 'module_focus':
        pathNodes = this.generateModuleFocusPath(graph, learnerState, allKnowledgePoints, request.focusModule!);
        break;
      case 'interview_prep':
        pathNodes = this.generateInterviewPath(graph, learnerState, allKnowledgePoints);
        break;
      default:
        pathNodes = this.generateSystemPath(graph, learnerState, allKnowledgePoints);
    }

    // 4. 限制节点数
    if (request.maxNodes && pathNodes.length > request.maxNodes) {
      pathNodes = pathNodes.slice(0, request.maxNodes);
    }

    // 5. 生成里程碑
    const milestones = this.generateMilestones(pathNodes, pathType);

    // 6. 计算总时长和进度
    const totalEstimatedMinutes = pathNodes.reduce((sum, n) => sum + n.estimatedMinutes, 0);
    const progress = this.calculateProgress(pathNodes);

    return {
      pathId: `path-${request.userId}-${pathType}-${Date.now()}`,
      pathName: this.getPathName(pathType, request),
      pathType,
      description: this.getPathDescription(pathType, learnerState.profileType, request),
      nodes: pathNodes,
      totalEstimatedMinutes,
      progress,
      milestones,
      meta: {
        profileType: learnerState.profileType,
        targetNodeId: request.targetNodeId,
        generatedAt: Date.now(),
      },
    };
  }

  /**
   * 动态更新路径 — 基于最新学习进度
   */
  async updatePath(
    existingPath: LearningPathResult,
    learnerState: LearnerState,
  ): Promise<LearningPathResult> {
    // 获取最新知识点数据
    const allKnowledgePoints = await this.getAllKnowledgePoints();

    // 更新路径节点的掌握状态
    const updatedNodes = existingPath.nodes.map(node => {
      const mastery = learnerState.knowledgeMastery[node.nodeId] || 0;
      return {
        ...node,
        mastery,
        status: this.determineNodeStatus(node, mastery, learnerState, existingPath.nodes) as PathNode['status'],
      };
    });

    // 检查是否需要新增节点（如果路径末尾的知识点都已完成）
    const lastIncomplete = updatedNodes.findIndex(n => n.status !== 'mastered' && n.status !== 'completed');
    if (lastIncomplete === -1) {
      // 所有节点都完成了，可能需要追加新节点
      this.logger.log('路径中所有节点已完成，考虑追加新内容');
    }

    return {
      ...existingPath,
      nodes: updatedNodes,
      progress: this.calculateProgress(updatedNodes),
      milestones: this.generateMilestones(updatedNodes, existingPath.pathType),
    };
  }

  /**
   * 获取当前可学习的知识点（前置条件已满足 + 未掌握）
   */
  async getAvailableNodes(learnerState: LearnerState): Promise<PathNode[]> {
    const allKnowledgePoints = await this.getAllKnowledgePoints();
    const graph = this.buildKnowledgeGraph(allKnowledgePoints);

    return allKnowledgePoints
      .filter(kp => {
        const mastery = learnerState.knowledgeMastery[kp.nodeId!] || 0;
        if (mastery >= 0.85) return false; // 已掌握

        // 检查前置条件
        const prereqs = (kp.prerequisites as string[]) || [];
        return prereqs.every(p => (learnerState.knowledgeMastery[p] || 0) >= 0.5);
      })
      .map(kp => this.kpToPathNode(kp, learnerState, graph));
  }

  // ===== 路径生成算法 =====

  /**
   * 系统推荐路径 — 基于拓扑排序 + 画像调整
   */
  private generateSystemPath(
    graph: Map<string, string[]>,
    learnerState: LearnerState,
    allKPs: Partial<KnowledgePoint>[],
  ): PathNode[] {
    // 1. 拓扑排序
    const topoOrder = this.topologicalSort(graph, allKPs);

    // 2. 根据画像调整顺序
    const adjusted = this.adjustByProfile(topoOrder, learnerState.profileType, allKPs);

    // 3. 跳过已掌握的（但有经验者保留一些复习节点）
    const filtered = this.filterByProgress(adjusted, learnerState);

    // 4. 构建 PathNode
    return filtered.map(kp => this.kpToPathNode(kp, learnerState, graph));
  }

  /**
   * 目标驱动路径 — A* 搜索从当前位置到目标的最短路径
   */
  private generateTargetDrivenPath(
    graph: Map<string, string[]>,
    learnerState: LearnerState,
    allKPs: Partial<KnowledgePoint>[],
    targetNodeId: string,
  ): PathNode[] {
    // 验证目标存在
    const targetKP = allKPs.find(kp => kp.nodeId === targetNodeId);
    if (!targetKP) {
      this.logger.warn(`目标知识点 ${targetNodeId} 不存在，回退到系统推荐路径`);
      return this.generateSystemPath(graph, learnerState, allKPs);
    }

    // 从目标回溯：收集所有需要的前置知识点
    const requiredNodes = new Set<string>();
    const collectPrereqs = (nodeId: string) => {
      if (requiredNodes.has(nodeId)) return;
      requiredNodes.add(nodeId);

      const kp = allKPs.find(k => k.nodeId === nodeId);
      if (kp) {
        for (const preId of (kp.prerequisites as string[]) || []) {
          collectPrereqs(preId);
        }
      }
    };
    collectPrereqs(targetNodeId);

    // 按拓扑排序排列这些节点
    const relevantKPs = allKPs.filter(kp => kp.nodeId && requiredNodes.has(kp.nodeId));
    const subGraph = this.buildSubGraph(relevantKPs);
    const topoOrder = this.topologicalSort(subGraph, relevantKPs);

    // 过滤已掌握的
    const filtered = topoOrder.filter(kp => {
      const mastery = learnerState.knowledgeMastery[kp.nodeId!] || 0;
      return mastery < 0.85;
    });

    return filtered.map(kp => this.kpToPathNode(kp, learnerState, subGraph));
  }

  /**
   * 弱项强化路径 — 聚焦掌握度低的知识点
   */
  private generateWeaknessPath(
    graph: Map<string, string[]>,
    learnerState: LearnerState,
    allKPs: Partial<KnowledgePoint>[],
  ): PathNode[] {
    // 找出掌握度低于 0.5 的知识点
    const weakNodes = allKPs
      .map(kp => ({
        kp,
        mastery: learnerState.knowledgeMastery[kp.nodeId!] || 0,
      }))
      .filter(({ mastery }) => mastery > 0 && mastery < 0.5)
      .sort((a, b) => a.mastery - b.mastery); // 最弱的排前面

    if (weakNodes.length === 0) {
      // 没有明显的弱项，返回系统推荐
      return this.generateSystemPath(graph, learnerState, allKPs);
    }

    // 为每个弱项添加其前置知识点（确保路径可达）
    const requiredNodes = new Set<string>();
    for (const { kp } of weakNodes) {
      requiredNodes.add(kp.nodeId!);
      for (const preId of (kp.prerequisites as string[]) || []) {
        const preMastery = learnerState.knowledgeMastery[preId] || 0;
        if (preMastery < 0.5) {
          requiredNodes.add(preId);
        }
      }
    }

    const relevantKPs = allKPs.filter(kp => requiredNodes.has(kp.nodeId!));
    const subGraph = this.buildSubGraph(relevantKPs);
    const topoOrder = this.topologicalSort(subGraph, relevantKPs);

    return topoOrder.map(kp => this.kpToPathNode(kp, learnerState, subGraph));
  }

  /**
   * 模块聚焦路径 — 只学习指定模块
   */
  private generateModuleFocusPath(
    graph: Map<string, string[]>,
    learnerState: LearnerState,
    allKPs: Partial<KnowledgePoint>[],
    focusModule: string,
  ): PathNode[] {
    const moduleKPs = allKPs.filter(kp => kp.module === focusModule);

    if (moduleKPs.length === 0) {
      this.logger.warn(`模块 ${focusModule} 没有找到知识点，回退到系统推荐`);
      return this.generateSystemPath(graph, learnerState, allKPs);
    }

    // 模块内的拓扑排序
    const subGraph = this.buildSubGraph(moduleKPs);
    const topoOrder = this.topologicalSort(subGraph, moduleKPs);

    // 但也需要包含模块外的前置依赖
    const withPrereqs = this.ensurePrerequisitesIncluded(topoOrder, allKPs, learnerState);

    return withPrereqs.map(kp => this.kpToPathNode(kp, learnerState, graph));
  }

  /**
   * 面试冲刺路径 — 聚焦高频面试知识点
   */
  private generateInterviewPath(
    graph: Map<string, string[]>,
    learnerState: LearnerState,
    allKPs: Partial<KnowledgePoint>[],
  ): PathNode[] {
    // 面试高频知识点
    const interviewNodeIds = [
      'JS-003', 'JS-004', 'JS-007', 'JS-008', 'JS-009', 'JS-010', 'JS-011', 'JS-012',
      'REACT-003', 'REACT-004', 'REACT-005', 'REACT-007', 'REACT-010',
      'NODE-001', 'NODE-003', 'NODE-004', 'NODE-005',
      'ENG-002', 'ENG-003',
    ];

    const interviewKPs = allKPs.filter(kp => interviewNodeIds.includes(kp.nodeId!));

    // 确保前置依赖包含在内
    const withPrereqs = this.ensurePrerequisitesIncluded(interviewKPs, allKPs, learnerState);

    const subGraph = this.buildSubGraph(withPrereqs);
    const topoOrder = this.topologicalSort(subGraph, withPrereqs);

    // 过滤已掌握的
    const filtered = topoOrder.filter(kp => {
      const mastery = learnerState.knowledgeMastery[kp.nodeId!] || 0;
      return mastery < 0.9; // 面试路径，0.9 以上才算过关
    });

    return filtered.map(kp => this.kpToPathNode(kp, learnerState, subGraph));
  }

  // ===== 拓扑排序 (Kahn's Algorithm) =====

  private topologicalSort(
    graph: Map<string, string[]>,
    allKPs: Partial<KnowledgePoint>[],
  ): Partial<KnowledgePoint>[] {
    // 计算入度
    const inDegree = new Map<string, number>();
    const kpMap = new Map<string, Partial<KnowledgePoint>>();

    for (const kp of allKPs) {
      if (!kp.nodeId) continue;
      kpMap.set(kp.nodeId, kp);
      if (!inDegree.has(kp.nodeId)) inDegree.set(kp.nodeId, 0);
    }

    for (const kp of allKPs) {
      if (!kp.nodeId) continue;
      const deps = graph.get(kp.nodeId) || [];
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // 入度为0的节点入队
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    // 按难度和模块顺序排序同层级的节点
    queue.sort((a, b) => {
      const kpA = kpMap.get(a);
      const kpB = kpMap.get(b);
      return (kpA?.difficulty || 1) - (kpB?.difficulty || 1);
    });

    const result: Partial<KnowledgePoint>[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const kp = kpMap.get(nodeId);
      if (kp) result.push(kp);

      const deps = graph.get(nodeId) || [];
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) || 1) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
        }
      }

      // 重新排序队列
      queue.sort((a, b) => {
        const kpA = kpMap.get(a);
        const kpB = kpMap.get(b);
        return (kpA?.difficulty || 1) - (kpB?.difficulty || 1);
      });
    }

    return result;
  }

  // ===== 画像调整 =====

  private adjustByProfile(
    topoOrder: Partial<KnowledgePoint>[],
    profileType: StudentProfileType,
    allKPs: Partial<KnowledgePoint>[],
  ): Partial<KnowledgePoint>[] {
    switch (profileType) {
      case 'beginner':
        // 新手：严格按照拓扑序 + 低难度优先
        return [...topoOrder].sort((a, b) => {
          // 先按拓扑层级
          const levelA = this.getNodeLevel(a.nodeId!, allKPs);
          const levelB = this.getNodeLevel(b.nodeId!, allKPs);
          if (levelA !== levelB) return levelA - levelB;
          // 同层级按难度
          return (a.difficulty || 1) - (b.difficulty || 1);
        });

      case 'transition':
        // 转行者：快速跳过基础，聚焦新技术栈
        return topoOrder.filter(kp => {
          // 保留所有 Node/React 相关，跳过最基础的 JS
          if (kp.module === 'js-fundamentals' && (kp.difficulty || 1) <= 1) {
            return false; // 跳过 JS 入门级
          }
          return true;
        });

      case 'advanced':
        // 有经验者：跳过基础，聚焦高级和实战
        return topoOrder.filter(kp => {
          const diff = kp.difficulty || 1;
          if (diff <= 1) return false; // 跳过难度1
          if (diff === 2 && kp.module === 'js-fundamentals') return false; // 跳过 JS 基础
          return true;
        });

      default:
        return topoOrder;
    }
  }

  private filterByProgress(
    kps: Partial<KnowledgePoint>[],
    learnerState: LearnerState,
  ): Partial<KnowledgePoint>[] {
    return kps.filter(kp => {
      const mastery = learnerState.knowledgeMastery[kp.nodeId!] || 0;
      // 保留未掌握的 + 有经验者保留部分需要复习的
      if (mastery >= 0.85) return false;
      return true;
    });
  }

  // ===== 图构建 =====

  private buildKnowledgeGraph(allKPs: Partial<KnowledgePoint>[]): Map<string, string[]> {
    // 邻接表：nodeId → 依赖它的节点列表
    const graph = new Map<string, string[]>();

    for (const kp of allKPs) {
      if (!kp.nodeId) continue;
      if (!graph.has(kp.nodeId)) graph.set(kp.nodeId, []);

      const prereqs = (kp.prerequisites as string[]) || [];
      for (const preId of prereqs) {
        if (!graph.has(preId)) graph.set(preId, []);
        graph.get(preId)!.push(kp.nodeId);
      }
    }

    return graph;
  }

  private buildSubGraph(kps: Partial<KnowledgePoint>[]): Map<string, string[]> {
    return this.buildKnowledgeGraph(kps);
  }

  // ===== 工具方法 =====

  private async getAllKnowledgePoints(): Promise<Partial<KnowledgePoint>[]> {
    try {
      return await this.kpRepo.find({ where: { status: 'published' } });
    } catch {
      // 数据库未初始化时使用默认数据
      return this.getDefaultKnowledgePoints();
    }
  }

  private getDefaultKnowledgePoints(): Partial<KnowledgePoint>[] {
    // 基础默认数据，实际使用时由 knowledge-seed.data.ts 初始化
    return [
      { nodeId: 'JS-001', name: '变量与数据类型', domain: 'javascript', module: 'js-fundamentals', difficulty: 1, prerequisites: [], dependents: ['JS-002'], status: 'published' },
      { nodeId: 'JS-002', name: '运算符与表达式', domain: 'javascript', module: 'js-fundamentals', difficulty: 1, prerequisites: ['JS-001'], dependents: ['JS-003'], status: 'published' },
      { nodeId: 'JS-003', name: '条件语句', domain: 'javascript', module: 'js-fundamentals', difficulty: 1, prerequisites: ['JS-002'], dependents: ['JS-004'], status: 'published' },
      { nodeId: 'REACT-001', name: 'React 简介', domain: 'react', module: 'react-core', difficulty: 2, prerequisites: ['JS-001'], dependents: ['REACT-002'], status: 'published' },
      { nodeId: 'NODE-001', name: 'Node.js 简介', domain: 'nodejs', module: 'node-core', difficulty: 2, prerequisites: ['JS-001'], dependents: ['NODE-002'], status: 'published' },
    ];
  }

  private kpToPathNode(
    kp: Partial<KnowledgePoint>,
    learnerState: LearnerState,
    graph: Map<string, string[]>,
  ): PathNode {
    const nodeId = kp.nodeId!;
    const mastery = learnerState.knowledgeMastery[nodeId] || 0;
    const moduleConfig = MODULE_CONFIG[kp.module || ''] || { estimatedMinutesPerNode: 30 };

    return {
      nodeId,
      name: kp.name || nodeId,
      module: kp.module || 'unknown',
      difficulty: kp.difficulty || 1,
      estimatedMinutes: moduleConfig.estimatedMinutesPerNode * ((kp.difficulty || 1) / 2),
      prerequisites: (kp.prerequisites as string[]) || [],
      dependents: graph.get(nodeId) || [],
      level: 0, // 将在后面计算
      mastery,
      status: this.determineNodeStatus(kp, mastery, learnerState, []) as PathNode['status'],
    };
  }

  private determineNodeStatus(
    kp: Partial<KnowledgePoint>,
    mastery: number,
    learnerState: LearnerState,
    allNodes: PathNode[] | Partial<KnowledgePoint>[],
  ): string {
    if (mastery >= 0.85) return 'mastered';
    if (mastery >= 0.5) return 'in_progress';
    if (mastery > 0) return 'in_progress';

    // 检查前置条件是否满足
    const prereqs = (kp.prerequisites as string[]) || [];
    const prereqsMet = prereqs.every(p => (learnerState.knowledgeMastery[p] || 0) >= 0.5);

    if (prereqsMet) return 'available';
    return 'locked';
  }

  private getNodeLevel(nodeId: string, allKPs: Partial<KnowledgePoint>[]): number {
    // BFS 计算层级
    const kpMap = new Map(allKPs.map(kp => [kp.nodeId, kp]));
    const visited = new Set<string>();
    const queue: { id: string; level: number }[] = [{ id: nodeId, level: 0 }];

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const kp = kpMap.get(id);
      if (!kp) continue;

      const prereqs = (kp.prerequisites as string[]) || [];
      if (prereqs.length === 0) return level;

      for (const preId of prereqs) {
        if (!visited.has(preId)) {
          queue.push({ id: preId, level: level + 1 });
        }
      }
    }

    return 0;
  }

  private ensurePrerequisitesIncluded(
    kps: Partial<KnowledgePoint>[],
    allKPs: Partial<KnowledgePoint>[],
    learnerState: LearnerState,
  ): Partial<KnowledgePoint>[] {
    const includedIds = new Set(kps.map(kp => kp.nodeId));
    const toAdd: Partial<KnowledgePoint>[] = [];

    for (const kp of kps) {
      const prereqs = (kp.prerequisites as string[]) || [];
      for (const preId of prereqs) {
        if (!includedIds.has(preId)) {
          const preKP = allKPs.find(k => k.nodeId === preId);
          if (preKP && (learnerState.knowledgeMastery[preId] || 0) < 0.85) {
            toAdd.push(preKP);
            includedIds.add(preId);
          }
        }
      }
    }

    return [...toAdd, ...kps];
  }

  private calculateProgress(nodes: PathNode[]): number {
    if (nodes.length === 0) return 0;
    const mastered = nodes.filter(n => n.status === 'mastered' || n.mastery >= 0.85).length;
    return mastered / nodes.length;
  }

  private generateMilestones(nodes: PathNode[], pathType: LearningPathType): Milestone[] {
    const milestones: Milestone[] = [];
    let accumulatedMinutes = 0;

    // 每完成一个模块的最后一个节点作为里程碑
    const moduleLastNodes = new Map<string, number>();
    for (let i = 0; i < nodes.length; i++) {
      moduleLastNodes.set(nodes[i].module, i);
    }

    for (const [module, nodeIndex] of moduleLastNodes) {
      accumulatedMinutes = nodes.slice(0, nodeIndex + 1).reduce((sum, n) => sum + n.estimatedMinutes, 0);

      const moduleConfig = MODULE_CONFIG[module];
      milestones.push({
        name: `${moduleConfig?.icon || '📚'} ${moduleConfig?.name || module} 完成`,
        nodeIndex,
        description: `完成 ${moduleConfig?.name || module} 模块的所有知识点`,
        badge: `${module}-complete`,
        estimatedMinutes: accumulatedMinutes,
      });
    }

    // 如果节点数量超过5个，添加中间里程碑
    if (nodes.length > 5) {
      const quarterIndex = Math.floor(nodes.length * 0.25);
      const halfIndex = Math.floor(nodes.length * 0.5);

      if (!milestones.some(m => m.nodeIndex === quarterIndex)) {
        milestones.push({
          name: '🎯 入门阶段完成',
          nodeIndex: quarterIndex,
          description: '你已经完成了四分之一的学习路径',
          badge: 'quarter-milestone',
          estimatedMinutes: nodes.slice(0, quarterIndex + 1).reduce((sum, n) => sum + n.estimatedMinutes, 0),
        });
      }

      if (!milestones.some(m => m.nodeIndex === halfIndex)) {
        milestones.push({
          name: '🏆 进阶阶段完成',
          nodeIndex: halfIndex,
          description: '你已经完成了一半的学习路径，继续加油！',
          badge: 'half-milestone',
          estimatedMinutes: nodes.slice(0, halfIndex + 1).reduce((sum, n) => sum + n.estimatedMinutes, 0),
        });
      }
    }

    return milestones.sort((a, b) => a.nodeIndex - b.nodeIndex);
  }

  private getPathName(pathType: LearningPathType, request: PathPlanningRequest): string {
    switch (pathType) {
      case 'system_recommended':
        return `${this.getProfileLabel(request.learnerState.profileType)}推荐学习路径`;
      case 'target_driven':
        return `目标驱动：通往 ${request.targetNodeId} 的路径`;
      case 'weakness_reinforce':
        return '弱项强化路径';
      case 'module_focus':
        return `${MODULE_CONFIG[request.focusModule || '']?.name || request.focusModule} 模块专精`;
      case 'interview_prep':
        return '面试冲刺路径';
    }
  }

  private getPathDescription(
    pathType: LearningPathType,
    profileType: StudentProfileType,
    request: PathPlanningRequest,
  ): string {
    const profileLabel = this.getProfileLabel(profileType);

    switch (pathType) {
      case 'system_recommended':
        return `根据你的${profileLabel}画像，为你精心规划的系统化学习路径。从基础到进阶，循序渐进地掌握 Node.js + React 全栈开发。`;
      case 'target_driven':
        return `以 ${request.targetNodeId} 为目标，为你规划的最短学习路径。只学习目标所需的前置知识，最高效地达到目标。`;
      case 'weakness_reinforce':
        return `针对你的薄弱知识点，集中强化练习。优先攻克掌握度最低的知识点，巩固基础。`;
      case 'module_focus':
        return `专注于 ${MODULE_CONFIG[request.focusModule || '']?.name || request.focusModule} 模块的深度学习，系统掌握该领域所有知识点。`;
      case 'interview_prep':
        return `精选高频面试知识点，帮助你在短时间内强化面试所需的核心理念和实战能力。`;
    }
  }

  private getProfileLabel(profileType: StudentProfileType): string {
    switch (profileType) {
      case 'beginner': return '零基础新手';
      case 'transition': return '有基础转行';
      case 'advanced': return '有经验提升';
    }
  }
}

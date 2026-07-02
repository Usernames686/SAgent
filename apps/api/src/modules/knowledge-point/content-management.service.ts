// 内容管理系统 — 层次结构 + 关联关系 + 生命周期 + 版本控制
// 持久化版本：使用 TypeORM + SQLite

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItemEntity } from '../../entities/content-item.entity';
import { KnowledgeRelationEntity } from '../../entities/knowledge-relation.entity';
import { ContentVersionEntity } from '../../entities/content-version.entity';

// ===== 内容状态 =====
export type ContentStatus = 'draft' | 'in_review' | 'published' | 'monitoring' | 'optimizing' | 'archived';

// ===== 知识点关系类型 =====
export type KnowledgeRelationType =
  | 'prerequisite'   // 前置依赖
  | 'related'        // 相关关联
  | 'advanced'       // 进阶关系
  | 'application'    // 应用关系
  | 'comparison'     // 对比关系
  | 'protection';    // 防护关系

// ===== DTO 接口（保持与原接口兼容） =====
export interface ContentVersion {
  version: string;
  contentId: string;
  changes: string;
  author: string;
  status: ContentStatus;
  metrics?: Record<string, number>;
  createdAt: Date;
}

export interface KnowledgeRelation {
  sourceId: string;
  targetId: string;
  type: KnowledgeRelationType;
  description: string;
  weight: number;
}

export interface ContentItem {
  id: string;
  type: 'path' | 'stage' | 'module' | 'knowledge_point' | 'exercise';
  title: string;
  parentId?: string;
  children: string[];
  version: string;
  status: ContentStatus;
  metrics: {
    viewCount: number;
    completionRate: number;
    avgScore: number;
    feedbackScore: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ContentManagementService {
  private readonly logger = new Logger(ContentManagementService.name);

  constructor(
    @InjectRepository(ContentItemEntity)
    private readonly contentRepo: Repository<ContentItemEntity>,
    @InjectRepository(KnowledgeRelationEntity)
    private readonly relationRepo: Repository<KnowledgeRelationEntity>,
    @InjectRepository(ContentVersionEntity)
    private readonly versionRepo: Repository<ContentVersionEntity>,
  ) {}

  /**
   * 创建内容并分配版本
   */
  async createContent(params: {
    id?: string;
    type: ContentItem['type'];
    title: string;
    parentId?: string;
  }): Promise<ContentItem> {
    const id = params.id || `content-${Date.now()}`;

    const entity = this.contentRepo.create({
      id,
      type: params.type,
      title: params.title,
      parentId: params.parentId || null,
      children: [],
      version: '1.0.0',
      status: 'draft',
      metrics: { viewCount: 0, completionRate: 0, avgScore: 0, feedbackScore: 0 },
    });

    const saved = await this.contentRepo.save(entity);

    // 关联父节点
    if (params.parentId) {
      const parent = await this.contentRepo.findOne({ where: { id: params.parentId } });
      if (parent) {
        parent.children = [...(parent.children || []), id];
        await this.contentRepo.save(parent);
      }
    }

    // 记录版本
    await this.recordVersion(id, '1.0.0', '初始创建', 'system');

    return this.entityToItem(saved);
  }

  /**
   * 添加知识点关联关系
   */
  async addRelation(relation: KnowledgeRelation): Promise<void> {
    const existing = await this.relationRepo.findOne({
      where: {
        sourceId: relation.sourceId,
        targetId: relation.targetId,
        type: relation.type,
      },
    });
    if (!existing) {
      const entity = this.relationRepo.create({
        sourceId: relation.sourceId,
        targetId: relation.targetId,
        type: relation.type,
        description: relation.description,
        weight: relation.weight,
      });
      await this.relationRepo.save(entity);
    }
  }

  /**
   * 批量设置知识图谱关系（清空后重建）
   */
  async setRelations(relations: KnowledgeRelation[]): Promise<void> {
    await this.relationRepo.clear();
    const entities = relations.map(r =>
      this.relationRepo.create({
        sourceId: r.sourceId,
        targetId: r.targetId,
        type: r.type,
        description: r.description,
        weight: r.weight,
      }),
    );
    await this.relationRepo.save(entities);
  }

  /**
   * 按类型查询关联关系
   */
  async getRelations(type?: KnowledgeRelationType): Promise<KnowledgeRelation[]> {
    const entities = type
      ? await this.relationRepo.find({ where: { type } })
      : await this.relationRepo.find();
    return entities.map(this.entityToRelation);
  }

  /**
   * 获取指定知识点的所有关联
   */
  async getRelationsForNode(nodeId: string): Promise<{
    incoming: KnowledgeRelation[];
    outgoing: KnowledgeRelation[];
  }> {
    const incoming = await this.relationRepo.find({ where: { targetId: nodeId } });
    const outgoing = await this.relationRepo.find({ where: { sourceId: nodeId } });
    return {
      incoming: incoming.map(this.entityToRelation),
      outgoing: outgoing.map(this.entityToRelation),
    };
  }

  /**
   * 更新内容状态（生命周期流转）
   */
  async updateStatus(contentId: string, newStatus: ContentStatus): Promise<ContentItem> {
    const item = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!item) throw new Error(`内容 ${contentId} 不存在`);

    const validTransitions: Record<ContentStatus, ContentStatus[]> = {
      draft: ['in_review'],
      in_review: ['published', 'draft'],
      published: ['monitoring', 'archived'],
      monitoring: ['optimizing', 'archived'],
      optimizing: ['published', 'archived'],
      archived: [],
    };

    const allowed = validTransitions[item.status as ContentStatus];
    if (!allowed?.includes(newStatus)) {
      throw new Error(`不允许从 ${item.status} 转换到 ${newStatus}`);
    }

    item.status = newStatus;
    const saved = await this.contentRepo.save(item);
    return this.entityToItem(saved);
  }

  /**
   * 语义化版本升级
   */
  async bumpVersion(contentId: string, type: 'major' | 'minor' | 'patch', changes: string, author: string): Promise<ContentItem> {
    const item = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!item) throw new Error(`内容 ${contentId} 不存在`);

    const [major, minor, patch] = item.version.split('.').map(Number);
    let newVersion: string;

    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }

    item.version = newVersion;
    const saved = await this.contentRepo.save(item);
    await this.recordVersion(contentId, newVersion, changes, author);
    return this.entityToItem(saved);
  }

  /**
   * 获取版本历史
   */
  async getVersionHistory(contentId?: string): Promise<ContentVersion[]> {
    const entities = contentId
      ? await this.versionRepo.find({ where: { contentId }, order: { createdAt: 'DESC' } })
      : await this.versionRepo.find({ order: { createdAt: 'DESC' } });
    // 限制最近 50 个
    return entities.slice(0, 50).map(this.entityToVersion);
  }

  /**
   * 获取内容层次结构（扁平列表）
   */
  async getContentTree(): Promise<ContentItem[]> {
    const entities = await this.contentRepo.find({ order: { createdAt: 'ASC' } });
    return entities.map(this.entityToItem);
  }

  /**
   * 更新内容指标
   */
  async updateMetrics(contentId: string, metrics: Partial<ContentItem['metrics']>): Promise<void> {
    const item = await this.contentRepo.findOne({ where: { id: contentId } });
    if (item) {
      item.metrics = { ...item.metrics, ...metrics };
      await this.contentRepo.save(item);
    }
  }

  /**
   * 获取内容生命周期建议
   */
  async getLifecycleRecommendations(): Promise<{ contentId: string; title: string; suggestion: string; priority: 'high' | 'medium' | 'low' }[]> {
    const recommendations: { contentId: string; title: string; suggestion: string; priority: 'high' | 'medium' | 'low' }[] = [];
    const now = Date.now();

    const items = await this.contentRepo.find();
    for (const item of items) {
      const daysSinceUpdate = (now - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24);

      // 发布超过 90 天未更新 → 建议复审
      if (item.status === 'published' && daysSinceUpdate > 90) {
        recommendations.push({
          contentId: item.id,
          title: item.title,
          suggestion: `已发布 ${Math.floor(daysSinceUpdate)} 天，建议复审内容是否仍然有效`,
          priority: 'medium',
        });
      }

      // 完成率低于 30% → 建议优化
      if (item.status === 'published' && item.metrics.completionRate < 0.3 && item.metrics.viewCount > 10) {
        recommendations.push({
          contentId: item.id,
          title: item.title,
          suggestion: `完成率仅 ${Math.round(item.metrics.completionRate * 100)}%，建议优化内容难度或呈现方式`,
          priority: 'high',
        });
      }

      // 草稿超过 30 天 → 提醒
      if (item.status === 'draft' && daysSinceUpdate > 30) {
        recommendations.push({
          contentId: item.id,
          title: item.title,
          suggestion: `草稿已 ${Math.floor(daysSinceUpdate)} 天未处理`,
          priority: 'low',
        });
      }
    }

    return recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  }

  // ===== 私有辅助方法 =====

  private async recordVersion(contentId: string, version: string, changes: string, author: string): Promise<void> {
    const entity = this.versionRepo.create({
      version,
      contentId,
      changes,
      author,
      status: 'draft',
      metrics: null,
    });
    await this.versionRepo.save(entity);
  }

  private entityToItem(entity: ContentItemEntity): ContentItem {
    return {
      id: entity.id,
      type: entity.type,
      title: entity.title,
      parentId: entity.parentId || undefined,
      children: entity.children || [],
      version: entity.version,
      status: entity.status as ContentStatus,
      metrics: entity.metrics,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private entityToRelation(entity: KnowledgeRelationEntity): KnowledgeRelation {
    return {
      sourceId: entity.sourceId,
      targetId: entity.targetId,
      type: entity.type as KnowledgeRelationType,
      description: entity.description,
      weight: entity.weight,
    };
  }

  private entityToVersion(entity: ContentVersionEntity): ContentVersion {
    return {
      version: entity.version,
      contentId: entity.contentId,
      changes: entity.changes,
      author: entity.author,
      status: entity.status as ContentStatus,
      metrics: entity.metrics || undefined,
      createdAt: entity.createdAt,
    };
  }
}

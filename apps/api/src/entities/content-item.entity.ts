import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 内容项实体 — 支持层次结构、生命周期、版本控制
 */
@Entity('content_items')
export class ContentItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 30 })
  type: 'path' | 'stage' | 'module' | 'knowledge_point' | 'exercise';

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'parent_id' })
  parentId: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  children: string[];

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'simple-json', default: '{"viewCount":0,"completionRate":0,"avgScore":0,"feedbackScore":0}' })
  metrics: {
    viewCount: number;
    completionRate: number;
    avgScore: number;
    feedbackScore: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

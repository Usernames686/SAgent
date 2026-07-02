import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 内容版本历史实体 — 语义化版本 + 变更记录
 */
@Entity('content_versions')
export class ContentVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'varchar', length: 100, name: 'content_id' })
  contentId: string;

  @Column({ type: 'text' })
  changes: string;

  @Column({ type: 'varchar', length: 100 })
  author: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'simple-json', nullable: true })
  metrics: Record<string, number> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 进化事件实体 — 进化管线事件日志持久化
 */
@Entity('evolution_events')
export class EvolutionEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 30 })
  type: string;

  @Column({ type: 'varchar', length: 100, name: 'experiment_id' })
  experimentId: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-json', default: '{}' })
  details: Record<string, unknown>;

  @Column({ type: 'bigint' })
  timestamp: number;

  @Column({ type: 'boolean', name: 'requires_manual_review', default: false })
  requiresManualReview: boolean;

  @Column({ type: 'boolean', default: false })
  reviewed: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

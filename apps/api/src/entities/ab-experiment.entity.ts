import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A/B 实验实体 — 灰度发布 + 统计分析持久化
 */
@Entity('ab_experiments')
export class AbExperimentEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  dimension: string;

  @Column({ type: 'varchar', length: 100, name: 'control_id' })
  controlId: string;

  @Column({ type: 'varchar', length: 100, name: 'variant_id' })
  variantId: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'real', name: 'traffic_percent' })
  trafficPercent: number;

  @Column({ type: 'int', name: 'gray_stage_index' })
  grayStageIndex: number;

  @Column({ type: 'bigint', nullable: true, name: 'started_at' })
  startedAt: number | null;

  @Column({ type: 'simple-json', default: '[]' })
  stageResults: unknown[];

  @Column({ type: 'real', nullable: true })
  significance: number | null;

  @Column({ type: 'real', nullable: true, name: 'effect_size' })
  effectSize: number | null;

  @Column({ type: 'bigint', name: 'created_at' })
  createdAt: number;

  @Column({ type: 'bigint', name: 'updated_at' })
  updatedAt: number;
}

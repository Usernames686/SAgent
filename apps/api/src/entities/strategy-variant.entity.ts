import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 策略变体实体 — 进化引擎策略变体持久化
 */
@Entity('strategy_variants')
export class StrategyVariantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  dimension: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-json' })
  params: Record<string, unknown>;

  @Column({ type: 'varchar', length: 100, name: 'baseline_id' })
  baselineId: string;

  @Column({ type: 'bigint', name: 'created_at' })
  createdAt: number;
}

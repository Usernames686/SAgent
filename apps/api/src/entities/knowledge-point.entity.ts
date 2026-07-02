import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('knowledge_points')
export class KnowledgePoint {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  nodeId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  domain: string;

  @Column({ type: 'varchar', length: 50 })
  module: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  /** 学习阶段优先级: P0=核心必学, P1=常用进阶, P2=进阶优化, P3=底层原理&高级架构 */
  @Column({ type: 'varchar', length: 2, default: 'P1' })
  priority: string;

  @Column({ type: 'int' })
  difficulty: number;

  @Column({ type: 'int', name: 'estimated_minutes' })
  estimatedMinutes: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-json', default: '[]' })
  prerequisites: string[];

  @Column({ type: 'simple-json', default: '[]' })
  dependents: string[];

  @Column({ type: 'simple-json', default: '[]' })
  skills: string[];

  @Column({ type: 'simple-json', name: 'assessment_criteria' })
  assessmentCriteria: {
    basic: string;
    intermediate: string;
    advanced: string;
  };

  @Column({ type: 'simple-json', default: '{}' })
  resources: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

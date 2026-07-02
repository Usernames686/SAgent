import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 知识点关联关系实体 — 6 种关联类型
 */
@Entity('knowledge_relations')
export class KnowledgeRelationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, name: 'source_id' })
  sourceId: string;

  @Column({ type: 'varchar', length: 100, name: 'target_id' })
  targetId: string;

  @Column({ type: 'varchar', length: 30 })
  type: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'real', default: 1.0 })
  weight: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

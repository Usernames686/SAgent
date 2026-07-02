import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 30 })
  type: string;

  @Column({ type: 'int' })
  difficulty: number;

  @Column({ type: 'simple-json', name: 'knowledge_point_ids' })
  knowledgePointIds: string[];

  @Column({ type: 'varchar', length: 30, nullable: true })
  language: string;

  @Column({ type: 'text', nullable: true })
  template: string;

  @Column({ type: 'simple-json', name: 'test_cases', default: '[]' })
  testCases: { input: string; expectedOutput: string; isHidden: boolean }[];

  @Column({ type: 'simple-json', default: '[]' })
  hints: string[];

  @Column({ type: 'text', name: 'reference_solution', nullable: true })
  referenceSolution: string;

  @Column({ type: 'simple-json', name: 'vibe_prompt', nullable: true })
  vibePrompt: {
    expectedStyle: string;
    expectedKeywords: string[];
    evaluationCriteria: string;
  } | null;

  @Column({ type: 'simple-json', default: '{}' })
  stats: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

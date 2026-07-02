import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('learning_paths')
export class LearningPath {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  goal: string;

  @Column({ type: 'simple-json' })
  stages: { name: string; knowledgePointIds: string[]; estimatedHours: number }[];

  @Column({ type: 'int', name: 'current_stage_index', default: 0 })
  currentStageIndex: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  progress: number;

  @Column({ type: 'simple-json', name: 'knowledge_state', default: '{}' })
  knowledgeState: Record<string, number>;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 50, name: 'generated_by', default: 'ai' })
  generatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

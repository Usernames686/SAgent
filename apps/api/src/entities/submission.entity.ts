import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Exercise } from './exercise.entity';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Index()
  @Column({ name: 'exercise_id', type: 'varchar' })
  exerciseId: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'varchar', length: 30 })
  language: string;

  @Column({ type: 'simple-json', name: 'test_results', nullable: true })
  testResults: { testCaseIndex: number; passed: boolean; output: string; error?: string }[];

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'pass_rate', nullable: true })
  passRate: number;

  @Column({ type: 'boolean', name: 'is_passed', default: false })
  isPassed: boolean;

  @Column({ type: 'simple-json', name: 'ai_evaluation', nullable: true })
  aiEvaluation: Record<string, unknown>;

  @Column({ type: 'simple-json', name: 'code_review', nullable: true })
  codeReview: Record<string, unknown>;

  @Column({ type: 'int', name: 'attempt_number', default: 1 })
  attemptNumber: number;

  @Column({ type: 'int', name: 'duration_seconds', nullable: true })
  durationSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Exercise)
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;
}

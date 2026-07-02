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

@Entity('ai_sessions')
export class AiSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'simple-json', name: 'agents_used' })
  agentsUsed: string[];

  @Column({ type: 'simple-json', default: '{}' })
  context: Record<string, unknown>;

  @Column({ type: 'int', name: 'token_count', default: 0 })
  tokenCount: number;

  @Column({ type: 'int', name: 'user_rating', nullable: true })
  userRating: number;

  @Column({ type: 'text', name: 'user_feedback', nullable: true })
  userFeedback: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'ended_at', nullable: true })
  endedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

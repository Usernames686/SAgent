import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', unique: true })
  userId: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'simple-json' })
  basics: {
    age: number;
    occupation: string;
    education: string;
  };

  @Column({ type: 'simple-json' })
  goals: {
    targetRole: string;
    targetLanguages: string[];
    timeline: string;
    commitment: string;
  };

  @Column({ type: 'simple-json' })
  abilities: {
    overall: number;
    dimensions: Record<string, number>;
    confidence: number;
  };

  @Column({ type: 'simple-json', name: 'learning_style' })
  learningStyle: {
    preferredMode: string;
    pacePreference: string;
    challengeTolerance: number;
    hintPreference: string;
  };

  @Column({ type: 'simple-json', default: '{}' })
  behavior: Record<string, unknown>;

  @Column({ type: 'simple-json', default: '{}' })
  emotional: Record<string, unknown>;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('browse_history')
@Index(['userId', 'createdAt'])
export class BrowseHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', name: 'target_id' })
  targetId: string;

  @Column({ type: 'varchar', length: 50, name: 'target_type' })
  targetType: string; // exercise, knowledge_point, article, etc.

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'int', default: 1 })
  visitCount: number;

  @Column({ type: 'datetime', name: 'last_visited_at' })
  lastVisitedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

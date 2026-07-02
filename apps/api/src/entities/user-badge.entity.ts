import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_badges')
@Index(['userId', 'badgeId'], { unique: true })
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', name: 'badge_id' })
  badgeId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  earnedReason: string;

  @CreateDateColumn({ name: 'earned_at' })
  earnedAt: Date;
}

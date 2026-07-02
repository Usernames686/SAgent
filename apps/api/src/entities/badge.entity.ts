import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  icon: string;

  @Column({ type: 'varchar', length: 50, default: 'general' })
  category: string;

  @Column({ type: 'varchar', length: 20, default: 'common' })
  rarity: string; // common, rare, epic, legendary

  @Column({ type: 'int', default: 0 })
  xpReward: number;

  @Column({ type: 'simple-json', nullable: true })
  condition: Record<string, unknown>; // 达成条件

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

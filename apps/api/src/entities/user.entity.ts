import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 50 })
  nickname: string;

  @Column({ type: 'varchar', length: 500, name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 20, default: 'student' })
  role: string;

  @Column({ type: 'varchar', length: 20, default: 'free' })
  subscription: string;

  @Column({ type: 'boolean', name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 255, name: 'verification_token', nullable: true })
  verificationToken: string;

  @Column({ type: 'varchar', length: 255, name: 'reset_token', nullable: true })
  resetToken: string;

  @Column({ type: 'datetime', name: 'reset_token_expires', nullable: true })
  resetTokenExpires: Date;

  @Column({ type: 'simple-json', default: '{}' })
  preferences: Record<string, unknown>;

  @Column({ type: 'simple-json', default: '{}' })
  stats: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'last_active_at', nullable: true })
  lastActiveAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile: UserProfile;
}

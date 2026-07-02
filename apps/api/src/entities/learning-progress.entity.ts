import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 学习进度实体 — 记录每个用户对每个知识点的掌握状态
 *
 * 核心字段：
 * - status: 学习状态（locked → learning → passed → mastered）
 * - masteryScore: 综合掌握度分数 (0-100)
 * - easeFactor / interval / nextReviewAt: SM-2 间隔重复算法参数
 * - errorPatterns: 错误模式记录，用于错题回顾和个性化推荐
 */
@Entity('learning_progress')
export class LearningProgress {
  /** 用户 ID（复合主键） */
  @PrimaryColumn({ type: 'varchar', length: 36 })
  userId: string;

  /** 知识点 ID（复合主键） */
  @PrimaryColumn({ type: 'varchar', length: 50 })
  nodeId: string;

  /** 学习状态：locked=未解锁, learning=学习中, passed=已通过, mastered=已掌握 */
  @Column({ type: 'varchar', length: 20, default: 'locked' })
  status: 'locked' | 'learning' | 'passed' | 'mastered';

  /** 综合掌握度分数 0-100 */
  @Column({ type: 'float', default: 0 })
  masteryScore: number;

  /** 最近一次 Quiz 分数 0-100 */
  @Column({ type: 'float', default: 0 })
  quizScore: number;

  /** 最近一次练习分数 0-100 */
  @Column({ type: 'float', default: 0 })
  exerciseScore: number;

  /** 尝试次数 */
  @Column({ type: 'int', default: 0 })
  attemptsCount: number;

  /** 使用提示次数 */
  @Column({ type: 'int', default: 0 })
  hintUsageCount: number;

  /** 最后学习时间 */
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lastStudiedAt: Date;

  /** 下次复习时间（间隔重复） */
  @Index()
  @Column({ type: 'datetime', nullable: true })
  nextReviewAt: Date;

  /** SM-2 算法难度因子（默认 2.5） */
  @Column({ type: 'float', default: 2.5 })
  easeFactor: number;

  /** 复习间隔（天） */
  @Column({ type: 'int', default: 1 })
  interval: number;

  /** 错误模式记录 */
  @Column({ type: 'simple-json', default: '[]' })
  errorPatterns: string[];

  /** 创建时间 */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** 更新时间 */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

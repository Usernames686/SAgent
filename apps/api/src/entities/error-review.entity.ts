import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * 错题回顾实体 — 记录每次 Quiz/练习失败的详细信息
 *
 * 核心字段：
 * - nodeId / questionId: 定位到具体知识点和题目
 * - userAnswer / correctAnswer: 用户答案与正确答案
 * - errorType: 错误分类（概念错误/逻辑错误/语法错误/粗心错误）
 * - reviewed: 是否已回顾
 */
@Entity('error_reviews')
export class ErrorReview {
  /** 主键 */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 用户 ID */
  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  /** 知识点 ID */
  @Index()
  @Column({ type: 'varchar', length: 50 })
  nodeId: string;

  /** 题目 ID */
  @Column({ type: 'varchar', length: 100 })
  questionId: string;

  /** 题目内容（快照） */
  @Column({ type: 'text', nullable: true })
  questionContent: string;

  /** 用户答案 */
  @Column({ type: 'text' })
  userAnswer: string;

  /** 正确答案 */
  @Column({ type: 'text' })
  correctAnswer: string;

  /** 错误类型：concept=概念错误, logic=逻辑错误, syntax=语法错误, careless=粗心错误 */
  @Column({ type: 'varchar', length: 20, default: 'concept' })
  errorType: 'concept' | 'logic' | 'syntax' | 'careless';

  /** 错误解析 */
  @Column({ type: 'text', nullable: true })
  explanation: string;

  /** 是否已回顾 */
  @Column({ type: 'boolean', default: false })
  reviewed: boolean;

  /** 回顾次数 */
  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  /** 回顾时是否答对 */
  @Column({ type: 'boolean', nullable: true, default: null })
  reviewPassed: boolean | null;

  /** 来源类型：quiz=测验, exercise=练习, assessment=诊断 */
  @Column({ type: 'varchar', length: 20, default: 'quiz' })
  sourceType: 'quiz' | 'exercise' | 'assessment';

  /** 原始得分 */
  @Column({ type: 'float', default: 0 })
  originalScore: number;

  /** 创建时间 */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** 更新时间 */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** 用户关联 */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
{}
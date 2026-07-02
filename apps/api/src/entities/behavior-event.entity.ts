import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 行为事件实体 — 用户学习行为数据采集
 * 对应需求文档 5.1 节，覆盖页面交互/编码/AI/路径/评估等采集域
 */
@Entity('behavior_events')
@Index('idx_behavior_user_time', ['userId', 'createdAt'])
@Index('idx_behavior_type', ['eventType'])
@Index('idx_behavior_session', ['sessionId'])
export class BehaviorEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64, nullable: true })
  userId: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 64, nullable: true })
  sessionId: string | null;

  /** 采集域：page_view / coding / code_submit / ai_interaction / path / assessment / social */
  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType: string;

  /** 具体事件名，如 page_view.exercise_detail / code.run / ai.chat */
  @Column({ name: 'event_name', type: 'varchar', length: 100 })
  eventName: string;

  /** 事件载荷（JSON） */
  @Column({ type: 'text' })
  payload: string;

  /** 设备/环境信息 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  language: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

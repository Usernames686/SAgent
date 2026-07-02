import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BehaviorEventEntity } from '../../entities/behavior-event.entity';

export interface TrackEventInput {
  userId?: string;
  sessionId?: string;
  eventType: string;
  eventName: string;
  payload?: Record<string, unknown>;
  userAgent?: string;
  language?: string;
}

export interface BehaviorMetrics {
  totalEvents: number;
  uniqueUsers: number;
  byDomain: Record<string, number>;
  byEvent: Record<string, number>;
  recentTrend: Array<{ date: string; count: number }>;
}

@Injectable()
export class BehaviorTrackingService {
  private readonly logger = new Logger(BehaviorTrackingService.name);
  /** 内存缓冲队列，批量落库以降低 DB 压力 */
  private buffer: BehaviorEventEntity[] = [];
  private readonly flushThreshold = 50;
  private readonly flushIntervalMs = 5000;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(BehaviorEventEntity)
    private readonly repo: Repository<BehaviorEventEntity>,
  ) {
    // 启动定时刷盘
    this.flushTimer = setInterval(() => this.flush().catch(e => this.logger.warn(`定时刷盘失败: ${(e as Error).message}`)), this.flushIntervalMs);
  }

  /** 记录一条行为事件（异步非阻塞，先入缓冲） */
  track(input: TrackEventInput): void {
    const entity = this.repo.create({
      userId: input.userId || null,
      sessionId: input.sessionId || null,
      eventType: input.eventType,
      eventName: input.eventName,
      payload: JSON.stringify(input.payload || {}),
      userAgent: input.userAgent || null,
      language: input.language || null,
    });
    this.buffer.push(entity);

    if (this.buffer.length >= this.flushThreshold) {
      this.flush().catch(e => this.logger.warn(`刷盘失败: ${(e as Error).message}`));
    }
  }

  /** 批量落库 */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      await this.repo.save(batch);
    } catch (e) {
      // 失败时回灌缓冲，下次重试
      this.buffer.unshift(...batch);
      this.logger.error(`行为事件落库失败: ${(e as Error).message}`);
    }
  }

  /** 关闭时清理 */
  onModuleDestroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush().catch(() => {});
  }

  /** 查询指定用户的行为事件 */
  async getUserEvents(userId: string, limit = 100): Promise<BehaviorEventEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /** 查询某类事件（用于进化引擎分析） */
  async getEventsByType(eventType: string, since?: Date, limit = 1000): Promise<BehaviorEventEntity[]> {
    const where: Record<string, unknown> = { eventType };
    if (since) where.createdAt = Between(since, new Date());
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: limit });
  }

  /** 全局行为指标聚合（管理端/进化引擎用） */
  async getMetrics(since?: Date): Promise<BehaviorMetrics> {
    const where: Record<string, unknown> = {};
    if (since) where.createdAt = Between(since, new Date());

    const events = await this.repo.find({ where, order: { createdAt: 'DESC' }, take: 10000 });

    const byDomain: Record<string, number> = {};
    const byEvent: Record<string, number> = {};
    const uniqueUsers = new Set<string>();
    const trendMap: Record<string, number> = {};

    for (const e of events) {
      byDomain[e.eventType] = (byDomain[e.eventType] || 0) + 1;
      byEvent[e.eventName] = (byEvent[e.eventName] || 0) + 1;
      if (e.userId) uniqueUsers.add(e.userId);
      const day = e.createdAt.toISOString().slice(0, 10);
      trendMap[day] = (trendMap[day] || 0) + 1;
    }

    const recentTrend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date, count }));

    return {
      totalEvents: events.length,
      uniqueUsers: uniqueUsers.size,
      byDomain,
      byEvent,
      recentTrend,
    };
  }

  /** 清理过期数据（默认保留 90 天） */
  async cleanup(retentionDays = 90): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    const result = await this.repo.delete({ createdAt: Between(new Date(0), cutoff) });
    return result.affected || 0;
  }
}

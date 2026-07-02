import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Submission } from '../../entities/submission.entity';
import { UserBadge } from '../../entities/user-badge.entity';
import { BrowseHistory } from '../../entities/browse-history.entity';
import { BehaviorEventEntity } from '../../entities/behavior-event.entity';
import { BehaviorTrackingService } from '../behavior/behavior-tracking.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(UserBadge)
    private readonly userBadgeRepo: Repository<UserBadge>,
    @InjectRepository(BrowseHistory)
    private readonly historyRepo: Repository<BrowseHistory>,
    @InjectRepository(BehaviorEventEntity)
    private readonly behaviorRepo: Repository<BehaviorEventEntity>,
    private readonly behaviorTracking: BehaviorTrackingService,
  ) {}

  async getUserDashboard(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const stats = (user?.stats || {}) as Record<string, number>;

    const [submissionCount, badgeCount, historyCount] = await Promise.all([
      this.submissionRepo.count({ where: { userId } }),
      this.userBadgeRepo.count({ where: { userId } }),
      this.historyRepo.count({ where: { userId } }),
    ]);

    const recentSubmissions = await this.submissionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      overview: {
        totalStudyMinutes: stats.totalStudyMinutes || 0,
        totalExercises: stats.totalExercises || submissionCount,
        streak: stats.streak || 0,
        level: stats.level || 1,
        xp: stats.xp || 0,
        badgesEarned: badgeCount,
        pagesVisited: historyCount,
      },
      recentActivity: recentSubmissions.map(s => ({
        id: s.id,
        type: 'submission',
        title: `提交练习`,
        passed: (s as unknown as Record<string, unknown>).isPassed || false,
        createdAt: s.createdAt,
      })),
      weeklyGoal: {
        target: 7,
        current: Math.min(stats.streak || 0, 7),
      },
    };
  }

  async getGlobalStats() {
    const [userCount, submissionCount, badgeCount] = await Promise.all([
      this.userRepo.count(),
      this.submissionRepo.count(),
      this.userBadgeRepo.count(),
    ]);
    return {
      totalUsers: userCount,
      totalSubmissions: submissionCount,
      totalBadgesEarned: badgeCount,
    };
  }

  /**
   * 行为数据驱动的深度指标 — 对应需求文档 5.5 节 8 项指标
   * 数据源：BehaviorEventEntity（由 BehaviorTrackingService 采集）
   */
  async getBehaviorMetrics(userId?: string, since?: Date): Promise<{
    learningEngagement: { avgSessionMinutes: number; weeklyFrequency: number; focusScore: number };
    learningQuality: { firstPassRate: number; errorRecoveryRate: number };
    learningEfficiency: { masterySpeed: number; knowledgeRetention: number };
    aiDependency: { aiUsageRate: number; aiSatisfaction: number };
    socialActivity: { interactions: number };
    raw: { totalEvents: number; byDomain: Record<string, number> };
  }> {
    const since7d = since || new Date(Date.now() - 7 * 86400000);
    const where: Record<string, unknown> = { createdAt: since7d };
    if (userId) where.userId = userId;
    const events = await this.behaviorRepo.find({ where, order: { createdAt: 'DESC' }, take: 5000 });

    const byDomain: Record<string, number> = {};
    const byEvent: Record<string, number> = {};
    const sessionSet = new Set<string>();
    let totalSessionMinutes = 0;
    let codeSubmit = 0, firstPass = 0;
    let aiInteractions = 0, aiPositive = 0;
    let socialActions = 0;

    for (const e of events) {
      byDomain[e.eventType] = (byDomain[e.eventType] || 0) + 1;
      byEvent[e.eventName] = (byEvent[e.eventName] || 0) + 1;
      if (e.sessionId) sessionSet.add(e.sessionId);
      const payload = JSON.parse(e.payload || '{}') as Record<string, unknown>;

      if (e.eventType === 'coding') totalSessionMinutes += Number(payload.durationMin) || 0;
      if (e.eventName === 'code_submit') {
        codeSubmit++;
        if (payload.firstPass === true) firstPass++;
      }
      if (e.eventType === 'ai_interaction') {
        aiInteractions++;
        if (payload.rating && Number(payload.rating) >= 4) aiPositive++;
      }
      if (e.eventType === 'social') socialActions++;
    }

    const sessionCount = Math.max(sessionSet.size, 1);
    const daysSince = Math.max((Date.now() - since7d.getTime()) / 86400000, 1);

    return {
      learningEngagement: {
        avgSessionMinutes: Math.round(totalSessionMinutes / sessionCount),
        weeklyFrequency: Math.round(sessionCount / daysSince * 7),
        focusScore: Math.min(events.filter(e => e.eventType === 'coding').length / 10, 1),
      },
      learningQuality: {
        firstPassRate: codeSubmit > 0 ? Math.round((firstPass / codeSubmit) * 100) : 0,
        errorRecoveryRate: 0, // 需 ErrorReview 实体关联，预留字段
      },
      learningEfficiency: {
        masterySpeed: 0, // 由 LearningProgressService 计算，预留
        knowledgeRetention: 0, // 由 spaced-repetition 统计，预留
      },
      aiDependency: {
        aiUsageRate: codeSubmit > 0 ? Math.round((aiInteractions / codeSubmit) * 100) : 0,
        aiSatisfaction: aiInteractions > 0 ? Math.round((aiPositive / aiInteractions) * 100) : 0,
      },
      socialActivity: { interactions: socialActions },
      raw: { totalEvents: events.length, byDomain },
    };
  }
}

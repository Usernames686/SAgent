import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from '../../entities/badge.entity';
import { UserBadge } from '../../entities/user-badge.entity';

@Injectable()
export class BadgeService {
  constructor(
    @InjectRepository(Badge)
    private readonly badgeRepo: Repository<Badge>,
    @InjectRepository(UserBadge)
    private readonly userBadgeRepo: Repository<UserBadge>,
  ) {}

  async findAll(category?: string) {
    await this.seedBadges();
    const qb = this.badgeRepo.createQueryBuilder('b').where('b.isActive = :active', { active: true });
    if (category) qb.andWhere('b.category = :category', { category });
    return qb.orderBy('b.rarity', 'ASC').getMany();
  }

  async getUserBadges(userId: string) {
    await this.seedBadges();
    const userBadges = await this.userBadgeRepo.find({
      where: { userId },
      order: { earnedAt: 'DESC' },
    });
    const badges = await this.badgeRepo.find();
    const badgeMap = new Map(badges.map(b => [b.id, b]));
    return userBadges.map(ub => ({
      ...ub,
      badge: badgeMap.get(ub.badgeId) || null,
    }));
  }

  async earnBadge(userId: string, badgeId: string, reason?: string) {
    const existing = await this.userBadgeRepo.findOne({
      where: { userId, badgeId },
    });
    if (existing) return existing;
    const ub = this.userBadgeRepo.create({
      userId,
      badgeId,
      earnedReason: reason || '',
    });
    return this.userBadgeRepo.save(ub);
  }

  async seedBadges() {
    const seeds: Partial<Badge>[] = [
      { name: '初学者', description: '完成第一个知识点', icon: '🌱', category: 'onboarding', rarity: 'common', xpReward: 10, condition: { type: 'knowledge_completed', count: 1 } },
      { name: '初学者之路', description: '完成第一个学习课程', icon: '🌱', category: 'study', rarity: 'common', xpReward: 50, condition: { type: 'knowledge_completed', count: 1 } },
      { name: '学习达人', description: '连续学习7天', icon: '📚', category: 'study', rarity: 'common', xpReward: 30, condition: { type: 'streak', days: 7 } },
      { name: '知识探索者', description: '掌握50个知识点', icon: '🔍', category: 'knowledge', rarity: 'rare', xpReward: 100, condition: { type: 'knowledge_completed', count: 50 } },
      { name: '概念大师', description: '连续通过10个概念测试', icon: '🧠', category: 'knowledge', rarity: 'epic', xpReward: 200, condition: { type: 'exercise_passed', count: 10 } },
      { name: '全栈之路', description: '完成前端与后端学习路径', icon: '🗺️', category: 'knowledge', rarity: 'legendary', xpReward: 500, condition: { type: 'path_completed' } },
      { name: 'AI入门', description: '完成AI基础课程', icon: '🤖', category: 'study', rarity: 'common', xpReward: 50, condition: { type: 'knowledge_completed', count: 3 } },
      { name: '持续学习者', description: '连续7天登录学习', icon: '📖', category: 'study', rarity: 'rare', xpReward: 150, condition: { type: 'streak', days: 7 } },
      { name: 'Hello World', description: '编写并运行第一行代码', icon: '👋', category: 'coding', rarity: 'common', xpReward: 30, condition: { type: 'exercise_passed', count: 1 } },
      { name: '代码新星', description: '提交50次代码', icon: '⭐', category: 'coding', rarity: 'rare', xpReward: 120, condition: { type: 'exercise_passed', count: 50 } },
      { name: 'Debug高手', description: '独立修复10个Bug', icon: '🐛', category: 'coding', rarity: 'rare', xpReward: 150, condition: { type: 'exercise_passed', count: 10 } },
      { name: '代码审查专家', description: '审查20个Pull Request', icon: '🔎', category: 'coding', rarity: 'epic', xpReward: 200, condition: { type: 'exercise_passed', count: 20 } },
      { name: '代码高手', description: '10道练习全通过', icon: '🔥', category: 'exercise', rarity: 'rare', xpReward: 100, condition: { type: 'exercise_passed', count: 10 } },
      { name: '全栈工程师', description: '独立完成全栈项目', icon: '🏗️', category: 'coding', rarity: 'legendary', xpReward: 400, condition: { type: 'path_completed' } },
      { name: '性能优化师', description: '将应用加载时间减少50%', icon: '🚀', category: 'coding', rarity: 'epic', xpReward: 250, condition: { type: 'exercise_passed', count: 30 } },
      { name: '知识大师', description: '完成整个学习路径', icon: '🏆', category: 'knowledge', rarity: 'legendary', xpReward: 500, condition: { type: 'path_completed' } },
      { name: '助人为乐', description: '回答3个社区问题', icon: '🤝', category: 'community', rarity: 'rare', xpReward: 50, condition: { type: 'community_posts', count: 3 } },
      { name: '热心助人', description: '回答10个社区问题', icon: '🤝', category: 'community', rarity: 'common', xpReward: 80, condition: { type: 'community_posts', count: 10 } },
      { name: '知识分享者', description: '发布5篇技术文章', icon: '📢', category: 'community', rarity: 'rare', xpReward: 150, condition: { type: 'community_posts', count: 5 } },
      { name: '社区之星', description: '获得100次社区点赞', icon: '🌟', category: 'community', rarity: 'epic', xpReward: 300, condition: { type: 'community_posts', count: 20 } },
      { name: '首次发帖', description: '在社区发布第一个帖子', icon: '✍️', category: 'community', rarity: 'common', xpReward: 30, condition: { type: 'community_posts', count: 1 } },
      { name: '挑战先锋', description: '完成第一个编程挑战', icon: '⚡', category: 'challenge', rarity: 'common', xpReward: 50, condition: { type: 'exercise_passed', count: 1 } },
      { name: '速度之王', description: '在5分钟内完成挑战', icon: '⏱️', category: 'challenge', rarity: 'epic', xpReward: 250, condition: { type: 'exercise_passed', count: 15 } },
      { name: '完美通关', description: '挑战中获得满分', icon: '💎', category: 'challenge', rarity: 'legendary', xpReward: 400, condition: { type: 'exercise_passed', count: 50 } },
      { name: '进化见证者', description: '见证系统完成一次自动进化', icon: '🦋', category: 'evolution', rarity: 'rare', xpReward: 200, condition: { type: 'vibe', count: 5 } },
      { name: '自适应学习者', description: '完成自适应学习路径', icon: '🧬', category: 'evolution', rarity: 'epic', xpReward: 300, condition: { type: 'path_completed' } },
      { name: '路径规划师', description: '自定义并完成学习路径', icon: '🧭', category: 'evolution', rarity: 'legendary', xpReward: 350, condition: { type: 'path_completed' } },
      { name: '氛围大师', description: '完成100次氛围编程', icon: '🎨', category: 'vibe', rarity: 'epic', xpReward: 200, condition: { type: 'vibe', count: 100 } },
      { name: '氛围启动器', description: '完成第一次氛围编程生成', icon: '✨', category: 'vibe', rarity: 'common', xpReward: 40, condition: { type: 'vibe', count: 1 } },
      { name: '提示词导演', description: '连续优化同一个需求并产出可预览页面', icon: '🎬', category: 'vibe', rarity: 'rare', xpReward: 120, condition: { type: 'vibe', count: 10 } },
      { name: '全栈传说', description: '所有技能维度达到高级', icon: '👑', category: 'achievement', rarity: 'legendary', xpReward: 500, condition: { type: 'all_advanced' } },
    ];
    const existing = await this.badgeRepo.find({ select: ['name'] });
    const existingNames = new Set(existing.map((badge) => badge.name));
    for (const seed of seeds) {
      if (!seed.name || existingNames.has(seed.name)) continue;
      await this.badgeRepo.save(this.badgeRepo.create(seed));
      existingNames.add(seed.name);
    }
  }

  /** 自动检查并颁发徽章 */
  async checkAndAward(userId: string, stats: {
    knowledgeCompleted?: number; exercisePassed?: number; streakDays?: number;
    vibeCount?: number; communityPosts?: number; pathCompleted?: boolean;
  }) {
    await this.seedBadges();
    const allBadges = await this.badgeRepo.find({ where: { isActive: true } });
    const earned = await this.userBadgeRepo.find({ where: { userId } });
    const earnedIds = new Set(earned.map(e => e.badgeId));
    const newlyAwarded: Badge[] = [];

    for (const badge of allBadges) {
      if (earnedIds.has(badge.id)) continue;
      const c = badge.condition;
      let shouldAward = false;
      if (c?.type === 'knowledge_completed' && (stats.knowledgeCompleted || 0) >= (c.count as number)) shouldAward = true;
      if (c?.type === 'exercise_passed' && (stats.exercisePassed || 0) >= (c.count as number)) shouldAward = true;
      if (c?.type === 'streak' && (stats.streakDays || 0) >= (c.days as number)) shouldAward = true;
      if (c?.type === 'vibe' && (stats.vibeCount || 0) >= (c.count as number)) shouldAward = true;
      if (c?.type === 'community_posts' && (stats.communityPosts || 0) >= (c.count as number)) shouldAward = true;
      if (c?.type === 'path_completed' && stats.pathCompleted) shouldAward = true;

      if (shouldAward) {
        await this.earnBadge(userId, badge.id, `自动达成: ${badge.name}`);
        newlyAwarded.push(badge);
      }
    }
    return newlyAwarded;
  }

  /** 学习进度汇总 */
  async getProgress(userId: string) {
    await this.seedBadges();
    const earned = await this.userBadgeRepo.count({ where: { userId } });
    const total = await this.badgeRepo.count({ where: { isActive: true } });
    return { earned, total, percent: total > 0 ? Math.round((earned / total) * 100) : 0 };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserProfile } from '../../entities/user-profile.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  async create(data: {
    email: string;
    passwordHash: string;
    nickname: string;
    verificationToken?: string;
  }): Promise<User> {
    const user = this.userRepo.create({
      email: data.email,
      passwordHash: data.passwordHash,
      nickname: data.nickname,
      verificationToken: data.verificationToken || undefined,
      preferences: { theme: 'dark', language: 'zh', editorKeymap: 'default' },
      stats: {
        totalStudyMinutes: 0,
        totalExercises: 0,
        streak: 0,
        level: 1,
        xp: 0,
      },
    });
    return this.userRepo.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async updateLastActive(id: string): Promise<void> {
    await this.userRepo.update(id, { lastActiveAt: new Date() });
  }

  async updateProfile(id: string, data: Record<string, unknown>): Promise<User> {
    await this.userRepo.update(id, data as any);
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  // ===== 邮箱验证相关 =====

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { verificationToken: token } });
  }

  async updateEmailVerified(id: string, verified: boolean): Promise<void> {
    await this.userRepo.update(id, { emailVerified: verified } as any);
  }

  async clearVerificationToken(id: string): Promise<void> {
    await this.userRepo.update(id, { verificationToken: null } as any);
  }

  async updateVerificationToken(id: string, token: string): Promise<void> {
    await this.userRepo.update(id, { verificationToken: token } as any);
  }

  // ===== 密码重置相关 =====

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { resetToken: token } });
  }

  async updateResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
    await this.userRepo.update(id, { resetToken: token, resetTokenExpires: expiresAt } as any);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.userRepo.update(id, { passwordHash } as any);
  }

  async clearResetToken(id: string): Promise<void> {
    await this.userRepo.update(id, { resetToken: null, resetTokenExpires: null } as any);
  }

  async getProfile(userId: string) {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      // 创建默认画像
      profile = this.profileRepo.create({
        userId,
        version: 1,
        basics: { age: 0, occupation: '', education: '' },
        goals: { targetRole: '', targetLanguages: [], timeline: '', commitment: '' },
        abilities: { overall: 0, dimensions: {}, confidence: 0 },
        learningStyle: { preferredMode: 'hands_on', pacePreference: 'moderate', challengeTolerance: 0.5, hintPreference: 'progressive' },
        behavior: {},
        emotional: {},
      });
      profile = await this.profileRepo.save(profile);
    }
    return profile;
  }

  async evaluateAssessment(userId: string, answers: Record<string, unknown>[]) {
    // IRT 自适应评估简化实现
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const totalCount = answers.length;
    const overallScore = totalCount > 0 ? correctCount / totalCount : 0;

    // 更新用户画像能力值
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepo.create({ userId });
    }

    profile.version = (profile.version || 0) + 1;
    profile.abilities = {
      overall: overallScore,
      dimensions: {
        programming_fundamentals: overallScore * 0.9,
        data_structures: overallScore * 0.7,
        algorithms: overallScore * 0.6,
        web_development: overallScore * 0.8,
        database: overallScore * 0.5,
        system_design: overallScore * 0.3,
        prompt_engineering: overallScore * 0.6,
        vibe_abstraction: overallScore * 0.5,
      },
      confidence: Math.min(0.5 + totalCount * 0.05, 0.95),
    };

    await this.profileRepo.save(profile);

    return {
      profile: profile.abilities,
      suggestedPath: {
        level: overallScore < 0.3 ? 'beginner' : overallScore < 0.6 ? 'elementary' : 'intermediate',
        focus: 'vibe_coding',
      },
    };
  }
}

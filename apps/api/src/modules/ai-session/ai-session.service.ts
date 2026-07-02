import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSession } from '../../entities/ai-session.entity';

@Injectable()
export class AiSessionService {
  constructor(
    @InjectRepository(AiSession)
    private readonly sessionRepo: Repository<AiSession>,
  ) {}

  async create(data: {
    userId: string;
    type: AiSession['type'];
    agentsUsed: string[];
    context?: Record<string, unknown>;
  }) {
    const session = this.sessionRepo.create({
      userId: data.userId,
      type: data.type,
      agentsUsed: data.agentsUsed,
      context: data.context || {},
    });
    return this.sessionRepo.save(session);
  }

  async findById(id: string) {
    return this.sessionRepo.findOne({ where: { id } });
  }

  async findByUser(userId: string, limit = 20) {
    return this.sessionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async updateFeedback(id: string, rating: number, feedback?: string) {
    await this.sessionRepo.update(id, {
      userRating: rating,
      userFeedback: feedback,
      endedAt: new Date(),
    });
  }

  async updateTokenCount(id: string, tokens: number) {
    const session = await this.findById(id);
    if (session) {
      await this.sessionRepo.update(id, {
        tokenCount: session.tokenCount + tokens,
      });
    }
  }
}

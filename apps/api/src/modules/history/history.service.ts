import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrowseHistory } from '../../entities/browse-history.entity';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(BrowseHistory)
    private readonly historyRepo: Repository<BrowseHistory>,
  ) {}

  async record(userId: string, data: { targetId: string; targetType: string; title?: string }) {
    const existing = await this.historyRepo.findOne({
      where: { userId, targetId: data.targetId, targetType: data.targetType },
    });
    if (existing) {
      existing.visitCount += 1;
      existing.lastVisitedAt = new Date();
      existing.title = data.title || existing.title;
      return this.historyRepo.save(existing);
    }
    const h = this.historyRepo.create({
      userId,
      ...data,
      visitCount: 1,
      lastVisitedAt: new Date(),
    });
    return this.historyRepo.save(h);
  }

  async findByUser(userId: string, targetType?: string, page = 1, limit = 20) {
    const where: Record<string, unknown> = { userId };
    if (targetType) where.targetType = targetType;
    const [items, total] = await this.historyRepo.findAndCount({
      where,
      order: { lastVisitedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, pageSize: limit };
  }

  async clearByUser(userId: string, targetType?: string) {
    const where: Record<string, unknown> = { userId };
    if (targetType) where.targetType = targetType;
    await this.historyRepo.delete(where);
    return { cleared: true };
  }
}

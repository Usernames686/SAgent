import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from '../../entities/bookmark.entity';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepo: Repository<Bookmark>,
  ) {}

  async findByUser(userId: string, targetType?: string) {
    const where: Record<string, unknown> = { userId };
    if (targetType) where.targetType = targetType;
    return this.bookmarkRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: string, data: { targetId: string; targetType: string; title?: string; note?: string }) {
    const existing = await this.bookmarkRepo.findOne({
      where: { userId, targetId: data.targetId, targetType: data.targetType },
    });
    if (existing) return existing;
    const bm = this.bookmarkRepo.create({ userId, ...data });
    return this.bookmarkRepo.save(bm);
  }

  async remove(userId: string, targetId: string, targetType: string) {
    const existing = await this.bookmarkRepo.findOne({
      where: { userId, targetId, targetType },
    });
    if (!existing) return { deleted: false };
    await this.bookmarkRepo.remove(existing);
    return { deleted: true };
  }

  async isBookmarked(userId: string, targetId: string, targetType: string) {
    const count = await this.bookmarkRepo.count({
      where: { userId, targetId, targetType },
    });
    return count > 0;
  }
}

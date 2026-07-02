import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { KnowledgeSeedService } from './knowledge-seed.service';

@Injectable()
export class KnowledgePointService {
  constructor(
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    private readonly seedService: KnowledgeSeedService,
  ) {}

  private async ensureSeeded() {
    await this.seedService.ensureSeeded();
  }

  async findAll(query: { domain?: string; module?: string }) {
    await this.ensureSeeded();
    const where: Record<string, unknown> = { status: 'published' };
    if (query.domain) where.domain = query.domain;
    if (query.module) where.module = query.module;
    return this.kpRepo.find({ where, order: { difficulty: 'ASC' } });
  }

  async findById(nodeId: string) {
    await this.ensureSeeded();
    return this.kpRepo.findOne({ where: { nodeId } });
  }

  async create(data: Partial<KnowledgePoint>) {
    const kp = this.kpRepo.create(data);
    return this.kpRepo.save(kp);
  }

  async getPrerequisites(nodeId: string) {
    const kp = await this.findById(nodeId);
    if (!kp) return [];
    const prerequisites = await Promise.all(
      kp.prerequisites.map((id) => this.findById(id)),
    );
    return prerequisites.filter(Boolean);
  }

  async getDependents(nodeId: string) {
    const kp = await this.findById(nodeId);
    if (!kp) return [];
    const dependents = await Promise.all(
      kp.dependents.map((id) => this.findById(id)),
    );
    return dependents.filter(Boolean);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { KnowledgeSeedService } from '../knowledge-point/knowledge-seed.service';
import { getOpenSourceReferencesForProject } from './project-open-source.catalog';
import { PROJECT_DEFINITIONS, getProjectDefinition } from './project-practice.seed';

interface SubmitProjectDto {
  repositoryUrl?: string;
  previewUrl?: string;
  notes?: string;
  checklist?: string[];
}

interface ProjectSubmissionRow {
  id: string;
  user_id: string;
  node_id: string;
  repository_url?: string | null;
  preview_url?: string | null;
  notes?: string | null;
  checklist_json: string;
  score: number;
  status: 'submitted' | 'accepted';
  created_at: string;
}

@Injectable()
export class ProjectPracticeService {
  private tableReady = false;

  constructor(
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    @InjectRepository(LearningProgress)
    private readonly progressRepo: Repository<LearningProgress>,
    private readonly seedService: KnowledgeSeedService,
  ) {}

  private async ensureTable() {
    if (this.tableReady) return;
    await this.kpRepo.query(`
      CREATE TABLE IF NOT EXISTS project_submissions (
        id varchar(36) PRIMARY KEY,
        user_id varchar(36) NOT NULL,
        node_id varchar(50) NOT NULL,
        repository_url text,
        preview_url text,
        notes text,
        checklist_json text NOT NULL,
        score integer NOT NULL,
        status varchar(20) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.kpRepo.query('CREATE INDEX IF NOT EXISTS idx_project_submissions_user_node ON project_submissions(user_id, node_id)');
    this.tableReady = true;
  }

  private async projectPoints() {
    await this.seedService.ensureSeeded();
    return this.kpRepo.find({
      where: { domain: 'vibe_coding', module: 'projects', status: 'published' },
      order: { difficulty: 'ASC' },
    });
  }

  private async latestSubmission(userId: string, nodeId: string): Promise<ProjectSubmissionRow | null> {
    await this.ensureTable();
    const rows = await this.kpRepo.query(
      'SELECT * FROM project_submissions WHERE user_id = ? AND node_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId, nodeId],
    ) as ProjectSubmissionRow[];
    return rows[0] || null;
  }

  private async submissionCount(userId: string, nodeId: string): Promise<number> {
    await this.ensureTable();
    const rows = await this.kpRepo.query(
      'SELECT COUNT(*) as count FROM project_submissions WHERE user_id = ? AND node_id = ?',
      [userId, nodeId],
    ) as Array<{ count: number }>;
    return Number(rows[0]?.count || 0);
  }

  private toSubmission(row: ProjectSubmissionRow | null) {
    if (!row) return null;
    return {
      id: row.id,
      nodeId: row.node_id,
      repositoryUrl: row.repository_url,
      previewUrl: row.preview_url,
      notes: row.notes,
      checklist: JSON.parse(row.checklist_json || '[]') as string[],
      score: Number(row.score),
      status: row.status,
      createdAt: row.created_at,
    };
  }

  private async enrichProject(kp: KnowledgePoint, userId: string) {
    const definition = getProjectDefinition(kp.nodeId);
    const latest = await this.latestSubmission(userId, kp.nodeId);
    const count = await this.submissionCount(userId, kp.nodeId);
    const progress = await this.progressRepo.findOne({ where: { userId, nodeId: kp.nodeId } });

    return {
      ...kp,
      theme: definition?.theme || kp.name,
      deliverables: definition?.deliverables || [],
      tasks: definition?.tasks || [],
      submissionCount: count,
      latestSubmission: this.toSubmission(latest),
      projectStatus: latest?.status || (progress?.status === 'passed' || progress?.status === 'mastered' ? 'accepted' : 'not_started'),
      masteryScore: progress?.masteryScore || 0,
    };
  }

  async findAll(userId: string) {
    const points = await this.projectPoints();
    const items = await Promise.all(points.map((kp) => this.enrichProject(kp, userId)));
    return {
      items,
      total: items.length,
      summary: {
        submitted: items.filter((item) => item.latestSubmission).length,
        accepted: items.filter((item) => item.projectStatus === 'accepted').length,
      },
    };
  }

  listOpenSourceReferences(nodeId?: string) {
    const items = getOpenSourceReferencesForProject(nodeId);
    return {
      items,
      total: items.length,
      summary: {
        permissive: items.filter((item) => item.licenseRisk === 'permissive').length,
        copyleft: items.filter((item) => item.licenseRisk === 'copyleft').length,
        referenceOnly: items.filter((item) => item.licenseRisk === 'reference-only').length,
      },
    };
  }

  async findOne(userId: string, nodeId: string) {
    const kp = await this.kpRepo.findOne({ where: { nodeId, module: 'projects', status: 'published' } });
    if (!kp) throw new NotFoundException('项目不存在');
    return this.enrichProject(kp, userId);
  }

  async listSubmissions(userId: string, nodeId: string) {
    await this.findOne(userId, nodeId);
    await this.ensureTable();
    const rows = await this.kpRepo.query(
      'SELECT * FROM project_submissions WHERE user_id = ? AND node_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId, nodeId],
    ) as ProjectSubmissionRow[];
    return { items: rows.map((row) => this.toSubmission(row)), total: rows.length };
  }

  async submit(userId: string, nodeId: string, dto: SubmitProjectDto) {
    const project = await this.findOne(userId, nodeId);
    const checklist = Array.from(new Set(dto.checklist || []));
    const totalTasks = project.tasks.length || PROJECT_DEFINITIONS[0].tasks.length;
    const checklistScore = Math.round((checklist.length / Math.max(totalTasks, 1)) * 70);
    const artifactScore = (dto.repositoryUrl ? 15 : 0) + (dto.previewUrl ? 10 : 0) + (dto.notes?.trim() ? 5 : 0);
    const score = Math.min(100, checklistScore + artifactScore);
    const status = score >= 80 ? 'accepted' : 'submitted';
    const id = randomUUID();

    await this.ensureTable();
    await this.kpRepo.query(
      `INSERT INTO project_submissions
        (id, user_id, node_id, repository_url, preview_url, notes, checklist_json, score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        nodeId,
        dto.repositoryUrl || null,
        dto.previewUrl || null,
        dto.notes || null,
        JSON.stringify(checklist),
        score,
        status,
      ],
    );

    if (status === 'accepted') {
      const progress = this.progressRepo.create({
        userId,
        nodeId,
        status: 'passed',
        masteryScore: Math.max(project.masteryScore || 0, score),
        exerciseScore: score,
        attemptsCount: (await this.submissionCount(userId, nodeId)),
        lastStudiedAt: new Date(),
      });
      await this.progressRepo.save(progress);
    }

    return {
      submission: this.toSubmission({
        id,
        user_id: userId,
        node_id: nodeId,
        repository_url: dto.repositoryUrl || null,
        preview_url: dto.previewUrl || null,
        notes: dto.notes || null,
        checklist_json: JSON.stringify(checklist),
        score,
        status,
        created_at: new Date().toISOString(),
      }),
      project: await this.findOne(userId, nodeId),
    };
  }
}

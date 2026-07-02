import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from '../../entities/exercise.entity';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { Submission } from '../../entities/submission.entity';
import { KnowledgeSeedService } from '../knowledge-point/knowledge-seed.service';
import { CodeSandboxService } from '../sandbox/code-sandbox.service';
import { getExerciseData } from '../vibe-learning/exercise-data';

@Injectable()
export class ExerciseService {
  private exerciseSeedChecked = false;

  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepo: Repository<Exercise>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    private readonly knowledgeSeed: KnowledgeSeedService,
    private readonly sandbox: CodeSandboxService,
  ) {}

  private async ensureGeneratedExercises() {
    if (this.exerciseSeedChecked) return;
    this.exerciseSeedChecked = true;

    const existing = await this.exerciseRepo.count({ where: { status: 'published' } });
    if (existing > 0) return;

    await this.knowledgeSeed.ensureSeeded();
    const knowledgePoints = await this.kpRepo.find({
      where: { status: 'published' },
      order: { difficulty: 'ASC', nodeId: 'ASC' },
    });

    const seeds = knowledgePoints
      .filter((kp) => kp.module !== 'projects')
      .slice(0, 80)
      .map((kp) => {
        const exerciseData = getExerciseData(kp);
        const runtimeChecks = exerciseData.runtimeChecks?.testCases || [];
        return this.exerciseRepo.create({
          title: `${kp.name} 编码练习`,
          description: kp.description || `围绕 ${kp.name} 完成一个小型编码任务，巩固核心知识点。`,
          type: 'coding',
          difficulty: Math.max(1, Math.min(5, kp.difficulty || 1)),
          knowledgePointIds: [kp.nodeId],
          language: 'javascript',
          template: exerciseData.template,
          testCases: runtimeChecks.map((testCase) => ({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            isHidden: false,
          })),
          hints: (exerciseData.hints || []).map((hint) => hint.content),
          referenceSolution: exerciseData.reference,
          vibePrompt: {
            expectedStyle: '先描述意图，再实现最小可运行代码，最后根据运行结果迭代。',
            expectedKeywords: kp.skills || [],
            evaluationCriteria: kp.assessmentCriteria?.basic || '能完成知识点对应的基本编码任务',
          },
          stats: { attempts: 0, passRate: 0 },
          version: '1.0',
          status: 'published',
        });
      });

    if (seeds.length > 0) {
      await this.exerciseRepo.save(seeds);
    }
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    difficulty?: number;
    module?: string;
    language?: string;
  }) {
    await this.ensureGeneratedExercises();

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const qb = this.exerciseRepo.createQueryBuilder('e').where('e.status = :status', { status: 'published' });

    if (query.difficulty) {
      qb.andWhere('e.difficulty = :difficulty', { difficulty: query.difficulty });
    }
    if (query.language) {
      qb.andWhere('e.language = :language', { language: query.language });
    }

    const [items, total] = await qb
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, pageSize: limit };
  }

  async findById(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepo.findOne({ where: { id } });
    if (!exercise) throw new NotFoundException('练习不存在');
    return exercise;
  }

  async submit(
    exerciseId: string,
    userId: string,
    code: string,
    language: string,
  ) {
    const exercise = await this.findById(exerciseId);

    // 使用沙箱执行测试用例
    const testResults = await this.runTests(exercise, code, language);
    const passedCount = testResults.filter((r) => r.passed).length;
    const passRate = testResults.length > 0 ? passedCount / testResults.length : 0;
    const isPassed = passRate === 1;

    const attemptCount = await this.submissionRepo.count({
      where: { userId, exerciseId },
    });

    const submission = this.submissionRepo.create({
      userId,
      exerciseId,
      code,
      language,
      testResults,
      passRate,
      isPassed,
      attemptNumber: attemptCount + 1,
    });

    return this.submissionRepo.save(submission);
  }

  async runCode(
    exerciseId: string,
    code: string,
    language: string,
    input: string,
  ) {
    await this.findById(exerciseId);

    try {
      const result = await this.sandbox.execute({ code, language, input });
      return { output: result.stdout, error: result.stderr || null, ...result };
    } catch (error) {
      return { output: null, error: (error as Error).message, success: false };
    }
  }

  async getSubmissions(exerciseId: string, userId: string, page = 1, limit = 20) {
    const [items, total] = await this.submissionRepo.findAndCount({
      where: { exerciseId, userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, pageSize: limit };
  }

  private async runTests(
    exercise: Exercise,
    code: string,
    language: string,
  ): Promise<{ testCaseIndex: number; passed: boolean; output: string; error?: string }[]> {
    const testCases = exercise.testCases || [];
    const results: { testCaseIndex: number; passed: boolean; output: string; error?: string }[] = [];

    for (let index = 0; index < testCases.length; index++) {
      const tc = testCases[index];
      try {
        const result = await this.sandbox.execute({
          code,
          language,
          input: tc.input,
          timeoutMs: 5000,
        });
        const passed = result.success && result.stdout.trim() === tc.expectedOutput.trim();
        results.push({
          testCaseIndex: index,
          passed,
          output: result.stdout,
          error: result.stderr || undefined,
        });
      } catch (error) {
        results.push({
          testCaseIndex: index,
          passed: false,
          output: '',
          error: (error as Error).message,
        });
      }
    }

    return results;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityPost } from '../../entities/community-post.entity';
import { CommunityComment } from '../../entities/community-comment.entity';

@Injectable()
export class CommunityService {
  private seeded = false;

  constructor(
    @InjectRepository(CommunityPost)
    private readonly postRepo: Repository<CommunityPost>,
    @InjectRepository(CommunityComment)
    private readonly commentRepo: Repository<CommunityComment>,
  ) {}

  private async ensureSeedPosts() {
    if (this.seeded) return;
    this.seeded = true;

    const posts: Partial<CommunityPost>[] = [
      {
        userId: 'system',
        type: 'showcase',
        title: '用氛围编程做一个个人作品集，需要先写清哪些约束？',
        content: '建议先固定目标用户、视觉关键词、技术栈、页面结构和不可做事项。越早把氛围说清楚，AI 生成出来的页面越不容易跑偏。',
        tags: ['氛围编程', '作品集', 'Prompt'],
        likeCount: 18,
        commentCount: 3,
        viewCount: 126,
        isPinned: true,
      },
      {
        userId: 'system',
        type: 'share',
        title: 'React 练习卡住时，我通常用三步 Prompt 拆解',
        content: '第一步让 AI 解释需求和状态流；第二步只生成最小组件；第三步再补样式、边界状态和测试点。不要一开始就让它写完整大页面。',
        tags: ['React', '练习方法', 'AI 辅助'],
        likeCount: 12,
        commentCount: 2,
        viewCount: 89,
      },
      {
        userId: 'system',
        type: 'question',
        title: '项目实战提交验收时，仓库地址和预览地址都必须填吗？',
        content: '不是必须，但验收评分会参考完成的任务清单、仓库、预览和提交说明。只有清单没有产物也能提交，但更适合当作阶段记录。',
        tags: ['项目实战', '验收', '提交'],
        likeCount: 7,
        commentCount: 1,
        viewCount: 54,
      },
      {
        userId: 'system',
        type: 'discussion',
        title: '你更喜欢先看概念，还是先让 AI 带着写代码？',
        content: '这套学习系统支持概念理解、动手实践和评估测验三段闭环。可以聊聊哪种顺序更适合你，也方便后续优化学习路径推荐。',
        tags: ['学习路径', '讨论'],
        likeCount: 9,
        commentCount: 4,
        viewCount: 73,
      },
      {
        userId: 'system',
        type: 'discussion',
        title: 'React Server Components 在实际项目中的落地经验',
        content: '从传统 SSR 迁移后首屏性能提升明显，但 Server/Client 组件边界、状态序列化和 Suspense 组织方式都需要重新设计。想和大家讨论中大型项目的拆分策略。',
        tags: ['React', 'Server Components', '性能优化'],
        likeCount: 128,
        commentCount: 47,
        viewCount: 2340,
      },
      {
        userId: 'system',
        type: 'question',
        title: 'TypeScript 类型推断导致编译变慢，有人遇到过吗？',
        content: '项目升级后编译时间从 12 秒涨到 45 秒，排查发现复杂泛型工具类型触发了大量推断开销。skipLibCheck 和 incremental 效果有限，想听听大家的优化经验。',
        tags: ['TypeScript', '编译优化', '工程化'],
        likeCount: 64,
        commentCount: 32,
        viewCount: 1580,
      },
      {
        userId: 'system',
        type: 'share',
        title: '分享：用 Vibe Coding 一周完成一个 SaaS 后台',
        content: '全程用 AI 辅助编码，从需求拆解、组件搭建、接口联调到部署上线只用了 5 个工作日。AI 负责生成初稿，我负责架构边界、代码审查和体验打磨，效率提升很明显。',
        tags: ['Vibe Coding', 'AI编程', 'SaaS', '效率'],
        likeCount: 215,
        commentCount: 89,
        viewCount: 5120,
        isPinned: true,
      },
      {
        userId: 'system',
        type: 'showcase',
        title: '开源项目展示：Rust + WebAssembly 图像处理库',
        content: '支持裁剪、滤镜、水印等常用操作，在浏览器端处理大图比纯 JS 方案快很多。项目已发布到 npm，欢迎大家试用和贡献代码。',
        tags: ['Rust', 'WebAssembly', '开源', '图像处理'],
        likeCount: 189,
        commentCount: 56,
        viewCount: 4200,
      },
      {
        userId: 'system',
        type: 'discussion',
        title: 'Monorepo 实践对比：Turborepo、Nx 和 pnpm workspaces',
        content: 'Turborepo 的构建缓存和任务编排很轻，Nx 的依赖图和增量构建更强，pnpm workspaces 最透明。团队选型时需要根据项目规模和治理需求取舍。',
        tags: ['Monorepo', 'Turborepo', 'Nx', '工程化'],
        likeCount: 145,
        commentCount: 52,
        viewCount: 3100,
      },
      {
        userId: 'system',
        type: 'share',
        title: '5 个提升氛围编程效率的 VS Code 插件',
        content: 'AI 补全、行内错误高亮、代码溯源、TS 错误美化和 API 调试工具组合使用，可以让“描述意图 -> 生成 -> 验证 -> 修正”的循环更顺滑。',
        tags: ['VS Code', '工具', 'Vibe Coding', '插件'],
        likeCount: 203,
        commentCount: 74,
        viewCount: 5600,
      },
      {
        userId: 'system',
        type: 'showcase',
        title: '展示：用 Three.js + AI 生成的交互式 3D 产品展示页',
        content: '一个支持手势旋转、缩放和部件详情的 3D 产品展示页面。3D 模型由 AI 生成初稿再手动优化，后续通过 LOD 和实例化渲染压低首屏成本。',
        tags: ['Three.js', '3D', 'WebGL', 'AI生成'],
        likeCount: 198,
        commentCount: 67,
        viewCount: 4800,
      },
    ];

    const existing = await this.postRepo.find({ select: ['title'] });
    const existingTitles = new Set(existing.map((post) => post.title));
    const missingPosts = posts.filter((post) => post.title && !existingTitles.has(post.title));
    if (missingPosts.length > 0) {
      await this.postRepo.save(missingPosts.map((post) => this.postRepo.create(post)));
    }
  }

  async findPosts(query: { type?: string; page?: number; limit?: number }) {
    await this.ensureSeedPosts();
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const qb = this.postRepo.createQueryBuilder('p')
      .where('p.status = :status', { status: 'published' });
    if (query.type) qb.andWhere('p.type = :type', { query: query.type, type: query.type });
    const [items, total] = await qb
      .orderBy('p.isPinned', 'DESC')
      .addOrderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, pageSize: limit };
  }

  async findPostById(id: string) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (post) {
      post.viewCount += 1;
      await this.postRepo.save(post);
    }
    return post;
  }

  async createPost(userId: string, data: { type?: string; title: string; content: string; tags?: string[] }) {
    const post = this.postRepo.create({ userId, ...data, type: data.type || 'discussion' });
    return this.postRepo.save(post);
  }

  async getComments(postId: string, page = 1, limit = 20) {
    const [items, total] = await this.commentRepo.findAndCount({
      where: { postId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, pageSize: limit };
  }

  async addComment(userId: string, postId: string, content: string, parentId?: string) {
    const comment = this.commentRepo.create({ userId, postId, content, parentId: parentId || null });
    const saved = await this.commentRepo.save(comment);
    await this.postRepo.increment({ id: postId }, 'commentCount', 1);
    return saved;
  }

  async likePost(postId: string) {
    await this.postRepo.increment({ id: postId }, 'likeCount', 1);
    return { liked: true };
  }
}

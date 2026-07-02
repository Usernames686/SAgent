import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgePoint } from '../../entities/knowledge-point.entity';
import { ALL_KNOWLEDGE_POINTS } from '../vibe-learning/knowledge-seed.data';

@Injectable()
export class KnowledgeSeedService implements OnModuleInit {
  private seeded = false;

  constructor(
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
  ) {}

  /**
   * 启动时仅做轻量 count 检查，不阻塞。
   * 如果需要 seed，延迟到首次请求时执行（see ensureSeeded）。
   */
  async onModuleInit() {
    const count = await this.kpRepo.count();
    if (count > 0) {
      console.log(`[KnowledgeSeed] ${count} knowledge points already exist, will reconcile missing seed data on first access.`);
    } else {
      console.log('[KnowledgeSeed] DB empty, will seed on first access.');
    }
  }

  /**
   * 懒 seed：仅在首次调用且尚未 seed 时执行写入。
   * 由 KnowledgePointService 在首次查询前调用。
   */
  async ensureSeeded() {
    if (this.seeded) return;
    this.seeded = true;
    console.log('[KnowledgeSeed] Reconciling knowledge points...');
    const points = this.buildAllKnowledgePoints();
    await this.kpRepo.save(points);
    console.log(`[KnowledgeSeed] Reconciled ${points.length} knowledge points.`);
  }

  private buildAllKnowledgePoints(): Partial<KnowledgePoint>[] {
    const legacyPoints = [
      // ========== JavaScript 核心基础 (P0) ==========
      ...this.moduleJSBasics(),
      // ========== 前端三件套 (P0) ==========
      ...this.moduleFrontendBasics(),
      // ========== Node.js P0: 核心必学 ==========
      ...this.moduleNodejsP0(),
      // ========== Node.js P1: 常用进阶 ==========
      ...this.moduleNodejsP1(),
      // ========== Node.js P2: 进阶优化 ==========
      ...this.moduleNodejsP2(),
      // ========== Node.js P3: 底层原理 & 高级架构 ==========
      ...this.moduleNodejsP3(),
      // ========== React P0: 核心必学 ==========
      ...this.moduleReactP0(),
      // ========== React P1: 常用进阶 ==========
      ...this.moduleReactP1(),
      // ========== React P2: 进阶优化 ==========
      ...this.moduleReactP2(),
      // ========== React P3: 底层原理 & 高级架构 ==========
      ...this.moduleReactP3(),
      // ========== 工程化与部署 ==========
      ...this.moduleEngineering(),
      // ========== AI + 现代开发 ==========
      ...this.moduleAIModern(),
    ];

    const byNodeId = new Map<string, Partial<KnowledgePoint>>();
    for (const point of legacyPoints) {
      if (point.nodeId) byNodeId.set(point.nodeId, point);
    }
    for (const point of ALL_KNOWLEDGE_POINTS) {
      if (point.nodeId) byNodeId.set(point.nodeId, point);
    }
    return Array.from(byNodeId.values());
  }

  private kp(
    nodeId: string, name: string, domain: string, module: string,
    category: string, priority: string, difficulty: number, estimatedMinutes: number,
    description: string, prerequisites: string[], skills: string[],
    basicCriteria: string, interCriteria: string, advCriteria: string,
  ): Partial<KnowledgePoint> {
    return {
      nodeId, name, domain, module, category, priority, difficulty,
      estimatedMinutes, description, prerequisites,
      dependents: [],
      skills, version: '2.0', status: 'published',
      assessmentCriteria: { basic: basicCriteria, intermediate: interCriteria, advanced: advCriteria },
      resources: {},
    };
  }

  // ========== JavaScript 核心基础 (P0) ==========
  private moduleJSBasics(): Partial<KnowledgePoint>[] {
    const m = 'javascript-basics';
    return [
      this.kp('JS-001', '变量与数据类型', 'javascript', m, '基础语法', 'P0', 1, 30,
        '了解 JavaScript 中的 var/let/const 声明方式，以及 Number/String/Boolean/null/undefined/Symbol/BigInt 等数据类型。学会使用 typeof 运算符。',
        [], ['变量声明', '数据类型', 'typeof'],
        '能声明变量并识别基本数据类型', '能区分 var/let/const 作用域差异', '能理解 Symbol 和 BigInt 的应用场景'),
      this.kp('JS-002', '运算符与表达式', 'javascript', m, '基础语法', 'P0', 1, 25,
        '掌握算术运算符、比较运算符、逻辑运算符、赋值运算符、三元运算符。理解运算符优先级和短路求值。',
        ['JS-001'], ['算术运算', '逻辑运算', '短路求值'],
        '能使用基本运算符进行计算', '能理解 &&/|| 短路求值', '能写出简洁的链式表达式'),
      this.kp('JS-003', '条件语句与循环', 'javascript', m, '控制流', 'P0', 1, 35,
        '掌握 if/else if/else、switch/case、三元运算符条件判断。学会 for/while/do-while 循环、break/continue 控制。',
        ['JS-001', 'JS-002'], ['条件判断', '循环控制', 'break/continue'],
        '能写出基本的 if/for 语句', '能使用 switch 和 while 解决问题', '能综合运用多种控制流优化代码'),
      this.kp('JS-004', '函数基础', 'javascript', m, '函数', 'P0', 1, 40,
        '理解函数声明与函数表达式的区别。掌握参数、返回值、默认参数、剩余参数、箭头函数。理解函数是一等公民。',
        ['JS-001', 'JS-002', 'JS-003'], ['函数声明', '箭头函数', '默认参数'],
        '能定义和调用函数', '能使用箭头函数和默认参数', '能理解闭包的初步概念'),
      this.kp('JS-005', '对象与数组', 'javascript', m, '数据结构', 'P0', 1, 40,
        '掌握对象字面量、属性访问、方法定义。掌握数组的增删改查、遍历方法 (forEach/map/filter/reduce/find)。理解引用类型。',
        ['JS-001', 'JS-004'], ['对象操作', '数组方法', '引用类型'],
        '能创建和操作对象与数组', '能使用 map/filter/reduce 处理数据', '能链式调用数组方法完成复杂数据转换'),
      this.kp('JS-006', '字符串与模板字面量', 'javascript', m, '内置对象', 'P0', 1, 25,
        '掌握字符串方法 (split/slice/includes/replace/trim)。学会模板字面量和标签模板。理解字符串不可变性。',
        ['JS-001', 'JS-005'], ['字符串方法', '模板字面量', '正则基础'],
        '能使用基本字符串方法', '能使用模板字面量拼接', '能结合正则做字符串处理'),
      this.kp('JS-007', '解构赋值与展开运算符', 'javascript', m, 'ES6+', 'P0', 1, 25,
        '掌握数组解构、对象解构、嵌套解构。学会展开运算符 (...) 在数组和对象中的用法。理解剩余模式。',
        ['JS-001', 'JS-005'], ['数组解构', '对象解构', '展开运算符'],
        '能解构数组和对象', '能使用展开运算符合并数据', '能在函数参数中灵活运用解构'),
      this.kp('JS-008', '作用域与闭包', 'javascript', m, '进阶概念', 'P1', 2, 45,
        '理解全局作用域、函数作用域、块级作用域 (let/const)。掌握闭包的定义、原理和实际应用 (数据私有化、柯里化)。',
        ['JS-001', 'JS-004'], ['作用域链', '闭包', '变量提升'],
        '能理解作用域的概念', '能写出闭包并解释其作用', '能利用闭包实现模块模式和柯里化'),
      this.kp('JS-009', '原型链与继承', 'javascript', m, '进阶概念', 'P2', 2, 50,
        '理解原型 (prototype) 和原型链的概念。掌握几种继承方式：原型链继承、构造函数继承、组合继承、ES6 class 继承。',
        ['JS-004', 'JS-005', 'JS-008'], ['原型', '原型链', 'class继承'],
        '能理解 __proto__ 和 prototype', '能使用 class 实现继承', '能解释原型链查找机制'),
      this.kp('JS-010', 'Promise 与异步编程', 'javascript', m, '异步', 'P0', 2, 60,
        '理解回调地狱问题。掌握 Promise 的创建、then/catch/finally、Promise.all/race/allSettled。学会 async/await 语法糖。',
        ['JS-004', 'JS-008'], ['Promise', 'async/await', '错误处理'],
        '能写出 Promise 链式调用', '能使用 async/await 简化异步代码', '能处理并发异步任务和错误边界'),
      this.kp('JS-011', '模块化 (ESM/CommonJS)', 'javascript', m, '工程化', 'P0', 2, 30,
        '理解 JavaScript 模块化的演变。掌握 ES Module (import/export) 和 CommonJS (require/module.exports) 的语法和区别。',
        ['JS-001', 'JS-004'], ['ES Module', 'CommonJS', '模块加载'],
        '能使用 import/export 导入导出', '能区分 ESM 和 CJS 差异', '能配置 package.json 的 type 字段'),
      this.kp('JS-012', '错误处理与调试', 'javascript', m, '工程化', 'P1', 1, 30,
        '掌握 try/catch/finally、throw 自定义错误。理解 Error 对象和错误栈。学会使用浏览器 DevTools 和 console 调试技巧。',
        ['JS-001', 'JS-004'], ['try/catch', '错误对象', '调试技巧'],
        '能使用 try/catch 捕获错误', '能理解错误栈信息', '能熟练使用 DevTools 调试'),
      this.kp('JS-013', 'Map/Set 与弱引用', 'javascript', m, 'ES6+', 'P2', 2, 25,
        '掌握 Map、Set、WeakMap、WeakSet 的用法和区别。理解弱引用的概念和内存管理优势。',
        ['JS-001', 'JS-005'], ['Map', 'Set', '弱引用'],
        '能使用 Map/Set 存储数据', '能区分 Map 和 Object 的适用场景', '能理解 WeakMap 的内存管理优势'),
      this.kp('JS-014', '生成器与迭代器', 'javascript', m, '进阶概念', 'P3', 3, 40,
        '理解迭代器协议 (Symbol.iterator) 和可迭代对象。掌握生成器函数 (function*) 和 yield 关键字。了解 for-await-of。',
        ['JS-004', 'JS-010'], ['迭代器', '生成器', 'yield'],
        '能理解 for...of 迭代机制', '能写出生成器函数', '能用生成器处理惰性求值'),
    ];
  }

  // ========== 前端三件套 (P0) ==========
  private moduleFrontendBasics(): Partial<KnowledgePoint>[] {
    const m = 'frontend-basics';
    return [
      this.kp('FE-001', 'HTML5 语义化标签', 'frontend', m, 'HTML', 'P0', 1, 25,
        '掌握 HTML5 文档结构和语义化标签 (header/nav/main/article/section/aside/footer)。理解 SEO 和可访问性。',
        [], ['语义化标签', '文档结构', 'SEO基础'],
        '能写出规范的 HTML 结构', '能选择合适的语义标签', '能优化页面 SEO 结构'),
      this.kp('FE-002', 'CSS 选择器与盒模型', 'frontend', m, 'CSS', 'P0', 1, 35,
        '掌握 CSS 选择器 (类/ID/属性/伪类/伪元素)。理解盒模型 (content-box/border-box)、margin 折叠。掌握 display 属性。',
        [], ['CSS选择器', '盒模型', 'display'],
        '能使用常用选择器设置样式', '能理解 border-box 和 content-box 差异', '能处理 margin 折叠问题'),
      this.kp('FE-003', 'Flexbox 弹性布局', 'frontend', m, '布局', 'P0', 1, 40,
        '掌握 Flex 容器和项目的核心属性 (justify-content/align-items/flex-grow/shrink/wrap)。学会常见布局模式。',
        ['FE-002'], ['Flexbox', '弹性布局', '对齐方式'],
        '能使用 Flex 实现常见布局', '能处理对齐和换行', '能设计复杂的弹性布局'),
      this.kp('FE-004', 'Grid 网格布局', 'frontend', m, '布局', 'P1', 2, 40,
        '掌握 CSS Grid 的核心概念：grid-template-rows/columns、gap、grid-area、auto-fill/fit。理解隐式网格。',
        ['FE-003'], ['CSS Grid', '网格布局', '响应式'],
        '能用 Grid 创建基本网格', '能用 grid-area 命名区域', '能设计响应式网格布局'),
      this.kp('FE-005', 'CSS 响应式设计', 'frontend', m, '布局', 'P1', 2, 35,
        '掌握媒体查询、viewport 单位、clamp()、container queries。理解移动优先设计策略。',
        ['FE-003'], ['媒体查询', '响应式', '移动优先'],
        '能使用媒体查询适配不同屏幕', '能使用相对单位', '能设计移动优先的响应式页面'),
      this.kp('FE-006', 'DOM 操作与事件', 'frontend', m, 'DOM', 'P0', 1, 35,
        '掌握 DOM 树结构、元素选择 (querySelector)、属性操作、事件监听 (addEventListener)、事件冒泡/捕获。理解事件委托。',
        ['JS-004'], ['DOM操作', '事件监听', '事件委托'],
        '能选择和操作 DOM 元素', '能绑定和处理事件', '能使用事件委托优化性能'),
      this.kp('FE-007', '浏览器存储', 'frontend', m, 'Web API', 'P1', 1, 20,
        '掌握 localStorage、sessionStorage、Cookie、IndexedDB 的使用场景和区别。理解存储限制和安全考虑。',
        ['JS-001'], ['localStorage', 'Cookie', 'IndexedDB'],
        '能使用 localStorage 存取数据', '能区分各种存储方案', '能设计客户端存储策略'),
      this.kp('FE-008', '网络请求 (Fetch/XHR)', 'frontend', m, 'Web API', 'P0', 2, 35,
        '掌握 Fetch API 的用法 (GET/POST/PUT/DELETE)。理解请求头、响应状态码、CORS。了解 FormData 和文件上传。',
        ['JS-010', 'FE-006'], ['Fetch API', 'HTTP请求', 'CORS'],
        '能用 fetch 发起 GET/POST 请求', '能处理响应和错误', '能理解 CORS 原理和解决方案'),
    ];
  }

  // ========== Node.js P0: 核心必学 ==========
  // 日常开发 90% 场景都在用，不学写不了代码
  private moduleNodejsP0(): Partial<KnowledgePoint>[] {
    const m = 'nodejs-p0';
    return [
      this.kp('NODE-001', 'Node.js 安装与运行', 'nodejs', m, '基础概念', 'P0', 1, 25,
        '了解 Node.js 是什么、为什么用 Node.js、事件驱动架构概览。掌握 Node.js 安装、node 命令运行脚本、REPL 交互。学会 nvm 版本管理。',
        ['JS-001'], ['Node.js安装', 'REPL', 'nvm'],
        '能安装 Node.js 并运行脚本', '能使用 nvm 管理多版本', '能解释 Node.js 事件驱动基本原理'),
      this.kp('NODE-002', 'npm 包管理', 'nodejs', m, '工程化', 'P0', 1, 30,
        '掌握 npm/pnpm 的基本命令 (install/run/init)。理解 package.json 字段、node_modules、lock 文件。掌握语义化版本控制 (^/~) 和 scripts。',
        ['NODE-001'], ['npm命令', 'package.json', '语义化版本'],
        '能安装和管理依赖包', '能理解语义化版本和 lock 文件', '能编写 package.json scripts 自动化任务'),
      this.kp('NODE-003', 'CommonJS 模块', 'nodejs', m, '模块系统', 'P0', 1, 25,
        '掌握 require/module.exports 的用法。理解模块缓存机制、循环依赖处理。对比 ESM 与 CJS 的差异。',
        ['NODE-001', 'JS-011'], ['require', 'module.exports', '模块缓存'],
        '能使用 require 导入模块', '能使用 module.exports 导出', '能理解模块缓存和循环依赖'),
      this.kp('NODE-004', '内置模块: fs/path', 'nodejs', m, '核心模块', 'P0', 2, 40,
        '掌握 fs 模块的文件读写 (同步/异步)。掌握 path 模块的路径拼接和解析。理解 __dirname 和 __filename。',
        ['NODE-001'], ['文件系统', '路径处理', '__dirname'],
        '能用 fs 读写文件', '能用 path 处理路径', '能理解同步和异步文件操作的差异'),
      this.kp('NODE-005', '环境变量与配置管理', 'nodejs', m, '工程化', 'P0', 1, 20,
        '掌握 process.env、dotenv 的使用。理解不同环境 (dev/test/prod) 的配置管理策略。学会 .env 文件管理。',
        ['NODE-001'], ['环境变量', 'dotenv', '多环境配置'],
        '能读取环境变量', '能使用 .env 文件管理配置', '能管理多环境配置策略'),
      this.kp('NODE-006', 'HTTP 服务器与路由', 'nodejs', m, 'Web基础', 'P0', 2, 40,
        '掌握 http 模块创建基本服务器。理解请求 (req) 和响应 (res) 对象。学会基本的 URL 路由分发。理解 HTTP 方法 (GET/POST)。',
        ['NODE-001', 'JS-010'], ['HTTP服务器', '请求响应', '路由分发'],
        '能用 http 模块创建服务器', '能处理 GET/POST 请求', '能实现基本的路由分发'),
      this.kp('NODE-007', 'Express 框架入门', 'nodejs', m, 'Web框架', 'P0', 2, 40,
        '掌握 Express 路由定义、中间件机制、请求处理 (params/query/body)。学会静态文件服务和错误处理中间件。',
        ['NODE-006', 'NODE-002'], ['Express路由', '中间件', '请求处理'],
        '能用 Express 创建路由', '能编写和使用中间件', '能处理 params/query/body 参数'),
    ];
  }

  // ========== Node.js P1: 常用进阶 ==========
  // 80% 的业务项目都会用到，学完能独立完成 95% 常规前后端开发
  private moduleNodejsP1(): Partial<KnowledgePoint>[] {
    const m = 'nodejs-p1';
    return [
      this.kp('NODE-008', 'NestJS 核心架构', 'nodejs', m, 'Web框架', 'P1', 3, 50,
        '掌握 NestJS 的核心概念：模块 (Module)、控制器 (Controller)、服务 (Service)、依赖注入 (DI)。理解装饰器驱动的开发模式。',
        ['NODE-007', 'JS-011'], ['NestJS架构', '依赖注入', '装饰器'],
        '能创建 NestJS 模块和控制器', '能使用依赖注入', '能理解 NestJS 的分层架构'),
      this.kp('NODE-009', 'RESTful API 设计', 'nodejs', m, 'API设计', 'P1', 2, 35,
        '掌握 RESTful API 设计原则：资源命名、HTTP 方法语义、状态码规范、分页/过滤/排序、版本管理。',
        ['NODE-007'], ['RESTful', 'API设计', '状态码'],
        '能设计符合 REST 规范的 API', '能正确使用 HTTP 方法和状态码', '能实现分页和过滤'),
      this.kp('NODE-010', '数据库与 TypeORM', 'nodejs', m, '数据持久化', 'P1', 3, 50,
        '掌握 SQLite/PostgreSQL 连接配置。学会 TypeORM 的 Entity、Repository、CRUD 操作、迁移 (Migration)、关联关系。',
        ['NODE-008'], ['TypeORM', 'Entity', '数据库迁移'],
        '能用 TypeORM 定义实体和执行 CRUD', '能编写数据库迁移', '能设计实体间的关联关系'),
      this.kp('NODE-011', 'JWT 认证与守卫', 'nodejs', m, '安全', 'P1', 3, 40,
        '掌握 JWT (JSON Web Token) 认证流程。学会 Passport 策略、NestJS Guard、refresh token 机制。理解 Cookie vs Token。',
        ['NODE-008', 'NODE-005'], ['JWT', 'Passport', 'Guard'],
        '能实现 JWT 登录认证', '能使用 Guard 保护路由', '能实现 refresh token 刷新'),
      this.kp('NODE-012', '错误处理与日志', 'nodejs', m, '工程化', 'P1', 2, 30,
        '掌握 NestJS 异常过滤器 (Exception Filter)。学会使用 winston/pino 结构化日志。理解错误码体系和全局错误处理。',
        ['NODE-008', 'JS-012'], ['异常过滤器', 'winston', '错误码'],
        '能实现异常过滤器', '能配置结构化日志', '能设计错误码体系'),
      this.kp('NODE-013', '数据验证与序列化', 'nodejs', m, '工程化', 'P1', 2, 25,
        '掌握 class-validator 和 class-transformer 的使用。理解 ValidationPipe、DTO 设计、序列化拦截器。',
        ['NODE-008'], ['class-validator', 'DTO', 'ValidationPipe'],
        '能使用 DTO 和验证装饰器', '能使用 ValidationPipe', '能实现响应序列化'),
      this.kp('NODE-014', 'ESM 与 TypeScript 配置', 'nodejs', m, '工程化', 'P1', 2, 35,
        '掌握 ES Module 在 Node.js 中的配置 (package.json type 字段)。学会 tsconfig.json 配置、ts-node/tsx 运行 TypeScript。',
        ['NODE-003', 'JS-011'], ['ESM配置', 'tsconfig', 'TypeScript运行'],
        '能配置 ESM 和 CJS 项目', '能配置 tsconfig.json', '能使用 ts-node 运行 TypeScript'),
    ];
  }

  // ========== Node.js P2: 进阶优化 ==========
  // 中大型项目、生产级质量必备
  private moduleNodejsP2(): Partial<KnowledgePoint>[] {
    const m = 'nodejs-p2';
    return [
      this.kp('NODE-015', '事件循环深入', 'nodejs', m, '核心机制', 'P2', 3, 45,
        '深入理解 Node.js 事件循环的六个阶段 (timers/pending/idle/prepare/poll/check/close)。理解微任务与宏任务。了解 process.nextTick。',
        ['NODE-001', 'JS-010'], ['事件循环', '微任务/宏任务', 'nextTick'],
        '能解释事件循环的基本流程', '能分析异步代码的执行顺序', '能优化高并发场景的事件循环'),
      this.kp('NODE-016', 'Buffer 与 Stream', 'nodejs', m, '核心API', 'P2', 3, 40,
        '理解 Buffer 处理二进制数据。掌握 Readable/Writable/Transform 流。学会管道操作和背压处理。',
        ['NODE-004', 'NODE-015'], ['Buffer', 'Stream', '管道'],
        '能使用 Buffer 处理数据', '能创建和使用流', '能理解背压机制'),
      this.kp('NODE-017', 'WebSocket 实时通信', 'nodejs', m, '实时通信', 'P2', 3, 45,
        '掌握 WebSocket 原理和 Socket.IO 使用。学会房间/命名空间管理、事件广播、认证集成。了解 NestJS Gateway。',
        ['NODE-008', 'NODE-005'], ['WebSocket', 'Socket.IO', 'Gateway'],
        '能建立 WebSocket 基本连接', '能使用房间和命名空间管理连接', '能实现实时协作功能'),
      this.kp('NODE-018', '文件上传与处理', 'nodejs', m, '文件管理', 'P2', 2, 30,
        '掌握 multer 文件上传、文件类型校验、大小限制。学会文件存储策略（本地/S3/OSS）和静态文件服务。',
        ['NODE-004', 'NODE-008'], ['文件上传', 'multer', '存储策略'],
        '能实现文件上传接口', '能校验文件类型和大小', '能配置静态文件服务'),
      this.kp('NODE-019', '缓存与性能优化', 'nodejs', m, '性能', 'P2', 3, 40,
        '掌握 Redis 缓存策略、cache-manager 集成。理解 HTTP 缓存头、节流/限流 (rate limiting)、连接池管理。',
        ['NODE-010', 'NODE-006'], ['Redis', '缓存策略', '限流'],
        '能使用 Redis 缓存数据', '能实现 HTTP 缓存策略', '能配置限流保护 API'),
      this.kp('NODE-020', 'API 文档与测试', 'nodejs', m, '工程化', 'P2', 3, 45,
        '掌握 Swagger/OpenAPI 文档生成 (@nestjs/swagger)。学会使用 Vitest 编写单元测试和 E2E 测试。理解测试覆盖率。',
        ['NODE-008', 'NODE-013'], ['Swagger', 'Vitest', 'E2E测试'],
        '能配置 Swagger 文档', '能编写单元测试', '能编写 E2E 测试并理解覆盖率'),
    ];
  }

  // ========== Node.js P3: 底层原理 & 高级架构 ==========
  // 面向技术专家、架构师、大厂高阶面试
  private moduleNodejsP3(): Partial<KnowledgePoint>[] {
    const m = 'nodejs-p3';
    return [
      this.kp('NODE-021', '进程与集群', 'nodejs', m, '系统架构', 'P3', 4, 45,
        '理解 process 对象、child_process 模块 (spawn/exec/fork)。掌握 cluster 模块的多进程架构。了解 PM2 进程管理和零停机部署。',
        ['NODE-015', 'NODE-016'], ['子进程', '集群', 'PM2'],
        '能使用 child_process 创建子进程', '能理解 cluster 工作原理', '能配置 PM2 管理应用'),
      this.kp('NODE-022', 'V8 引擎与内存管理', 'nodejs', m, '底层原理', 'P3', 5, 50,
        '理解 V8 引擎的内存模型、垃圾回收机制 (新生代/老生代)。掌握内存泄漏检测 (heapdump/vscode)。了解 C++ Addon 和 N-API。',
        ['NODE-015', 'JS-009'], ['V8', '垃圾回收', '内存泄漏'],
        '能理解 V8 垃圾回收机制', '能检测和修复内存泄漏', '能理解 C++ Addon 基本概念'),
      this.kp('NODE-023', '微服务架构', 'nodejs', m, '系统架构', 'P3', 4, 55,
        '理解微服务架构设计：服务拆分、消息队列 (RabbitMQ/Kafka)、服务发现与注册、分布式追踪、API 网关。了解 NestJS 微服务模块。',
        ['NODE-008', 'NODE-019'], ['微服务', '消息队列', '服务发现'],
        '能理解微服务架构设计', '能使用消息队列实现服务通信', '能设计 API 网关'),
    ];
  }

  // ========== React P0: 核心必学 ==========
  // 日常开发 90% 场景都在用，不学写不了代码
  private moduleReactP0(): Partial<KnowledgePoint>[] {
    const m = 'react-p0';
    return [
      this.kp('REACT-001', 'React 与 JSX', 'react', m, '入门', 'P0', 1, 30,
        '理解 React 是什么、虚拟 DOM、声明式编程。掌握 JSX 语法、表达式嵌入、条件渲染。了解 React 18 新特性。',
        ['FE-006', 'JS-004'], ['JSX语法', '虚拟DOM', '声明式UI'],
        '能写出 JSX 代码', '能理解虚拟 DOM 原理', '能对比声明式和命令式编程'),
      this.kp('REACT-002', '函数组件与 Props', 'react', m, '基础', 'P0', 1, 30,
        '掌握函数组件的定义和使用。理解 Props 的类型、默认值、children。学会组件组合模式。',
        ['REACT-001'], ['函数组件', 'Props', '组件组合'],
        '能创建函数组件', '能传递和使用 Props', '能用 children 组合组件'),
      this.kp('REACT-003', 'useState 状态管理', 'react', m, 'Hooks', 'P0', 1, 40,
        '掌握 useState Hook 的定义和更新。理解状态不可变性、更新队列、惰性初始化。掌握状态提升模式。',
        ['REACT-002'], ['useState', '状态提升', '不可变性'],
        '能使用 useState 管理状态', '能理解状态更新机制', '能实现状态提升'),
      this.kp('REACT-004', '条件渲染与列表渲染', 'react', m, '基础', 'P0', 1, 30,
        '掌握 &&、三元运算符、if-else 的条件渲染。掌握 map() 渲染列表、key 属性的重要性。',
        ['REACT-002'], ['条件渲染', '列表渲染', 'key属性'],
        '能实现条件渲染', '能渲染列表并理解 key 的作用', '能综合运用条件渲染和列表渲染'),
      this.kp('REACT-005', '事件处理与表单', 'react', m, '基础', 'P0', 1, 35,
        '掌握 React 事件绑定和事件对象。学会受控组件的值绑定和 onChange 处理。理解表单验证、提交处理。',
        ['REACT-003'], ['事件处理', '受控组件', '表单验证'],
        '能绑定事件和处理事件对象', '能创建受控表单', '能实现表单验证'),
      this.kp('REACT-006', '组件样式方案', 'react', m, '基础', 'P0', 1, 25,
        '掌握 React 中的样式方案：内联样式、CSS Modules、Tailwind CSS、CSS-in-JS。推荐使用 Tailwind。',
        ['REACT-002', 'FE-002'], ['Tailwind CSS', 'CSS Modules', 'CSS-in-JS'],
        '能使用 Tailwind 类名', '能使用 CSS Modules', '能选择适合的样式方案'),
    ];
  }

  // ========== React P1: 常用进阶 ==========
  // 80% 的业务项目都会用到
  private moduleReactP1(): Partial<KnowledgePoint>[] {
    const m = 'react-p1';
    return [
      this.kp('REACT-007', 'useEffect 与副作用', 'react', m, 'Hooks', 'P1', 2, 45,
        '掌握 useEffect 处理副作用（数据请求、订阅、DOM 操作）。理解依赖数组、清理函数、effect 执行时机。避免常见陷阱。',
        ['REACT-003', 'REACT-004'], ['useEffect', '副作用', '依赖数组'],
        '能使用 useEffect 请求数据', '能管理依赖数组', '能写出清理函数避免内存泄漏'),
      this.kp('REACT-008', 'useContext 与全局状态', 'react', m, '状态管理', 'P1', 2, 40,
        '掌握 Context API、Provider/Consumer 模式、useContext Hook。了解状态管理选型（Zustand/Jotai）。',
        ['REACT-003', 'REACT-005'], ['Context', 'useContext', 'Zustand'],
        '能用 Context 跨组件传递数据', '能设计 Context + Reducer 全局状态', '理解 Context 性能陷阱和状态管理库选型'),
      this.kp('REACT-009', 'React Router 路由', 'react', m, '路由', 'P1', 2, 40,
        '掌握 React Router v6 声明式路由、动态路由、嵌套路由、导航守卫。了解代码分割和懒加载。',
        ['REACT-006', 'REACT-004'], ['React Router', '动态路由', '嵌套路由'],
        '能用 Route/Link 实现页面切换', '能用动态路由和嵌套路由', '能实现路由守卫和代码分割'),
      this.kp('REACT-010', '自定义 Hook 设计', 'react', m, '设计模式', 'P1', 3, 45,
        '掌握自定义 Hook 设计原则、常见 Hook 封装（useLocalStorage/useDebounce/useFetch）。理解逻辑复用和组合模式。',
        ['REACT-007', 'REACT-008'], ['自定义Hook', 'Hook组合', '逻辑复用'],
        '能将重复逻辑提取为自定义 Hook', '能设计 useDebounce/useFetch 等通用 Hook', '理解 Hook 闭包限制和组合模式'),
      this.kp('REACT-011', 'TypeScript + React', 'react', m, '类型系统', 'P1', 3, 45,
        '掌握 React + TypeScript 的类型定义：组件 Props 类型、泛型组件、Hooks 类型、事件类型、ref 类型。',
        ['REACT-003', 'NODE-014'], ['TypeScript', '泛型组件', '类型安全'],
        '能为组件 Props 定义类型', '能使用泛型组件和 Hooks 类型', '能设计类型安全的组件 API'),
    ];
  }

  // ========== React P2: 进阶优化 ==========
  // 中大型项目、生产级质量必备
  private moduleReactP2(): Partial<KnowledgePoint>[] {
    const m = 'react-p2';
    return [
      this.kp('REACT-012', 'React 性能优化', 'react', m, '性能', 'P2', 3, 50,
        '掌握 React.memo、useMemo、useCallback 的使用场景和原理。理解渲染优化策略。避免过早优化。',
        ['REACT-007', 'REACT-008'], ['React.memo', 'useMemo', 'useCallback'],
        '能使用 memo 避免不必要重渲染', '能使用 useMemo 缓存计算', '能使用 useCallback 稳定引用'),
      this.kp('REACT-013', 'Next.js App Router', 'react', m, '框架', 'P2', 4, 55,
        '掌握 Next.js 13+ App Router：文件系统路由、布局 (layout.tsx)、加载 (loading.tsx)、错误 (error.tsx)、服务端组件与客户端组件。',
        ['REACT-009', 'REACT-007'], ['App Router', 'SSR/SSG', '服务端组件'],
        '能创建 App Router 页面', '能区分客户端和服务端组件', '能使用 SSR 和 ISR'),
      this.kp('REACT-014', 'React 测试', 'react', m, '测试', 'P2', 3, 45,
        '掌握 React Testing Library、Vitest、组件测试、Hook 测试、Mock 与 Spy、覆盖率。',
        ['REACT-003', 'NODE-020'], ['Testing Library', 'Vitest', '组件测试'],
        '能编写组件渲染测试', '能测试用户交互和 Hook', '能设计完整的组件测试策略'),
      this.kp('REACT-015', 'React 开发者工具', 'react', m, '工具', 'P2', 2, 20,
        '学会使用 React DevTools 调试组件、查看 props/state、Profiler 性能分析。使用浏览器 DevTools 调试 React 应用。',
        ['REACT-007'], ['React DevTools', '调试', 'Profiler'],
        '能安装和使用 React DevTools', '能查看组件树和状态', '能做性能分析定位渲染瓶颈'),
    ];
  }

  // ========== React P3: 底层原理 & 高级架构 ==========
  // 面向技术专家、架构师、大厂高阶面试
  private moduleReactP3(): Partial<KnowledgePoint>[] {
    const m = 'react-p3';
    return [
      this.kp('REACT-016', 'React Fiber 架构', 'react', m, '底层原理', 'P3', 5, 55,
        '深入理解 React Fiber 架构：调度器 (Scheduler)、协调器 (Reconciler)、渲染器 (Renderer)。理解 Lane 优先级模型和时间切片。',
        ['REACT-012', 'JS-009'], ['Fiber', '调度器', 'Lane'],
        '能理解 Fiber 节点树结构', '能解释调度和协调的工作流程', '能理解 Lane 优先级和时间切片'),
      this.kp('REACT-017', 'Concurrent 模式', 'react', m, '高级特性', 'P3', 4, 50,
        '掌握 React 18 并发特性：Suspense、useTransition、useDeferredValue。理解流式 SSR 和 Selective Hydration。',
        ['REACT-016', 'REACT-013'], ['Concurrent', 'Suspense', '流式SSR'],
        '能使用 useTransition 和 Suspense', '能理解并发渲染机制', '能实现流式 SSR'),
      this.kp('REACT-018', '大型应用架构', 'react', m, '系统架构', 'P3', 5, 60,
        '理解大型 React 应用的架构设计：状态机 (XState)、模块联邦 (Module Federation)、微前端 (Micro Frontends)、设计系统。',
        ['REACT-010', 'REACT-012'], ['XState', '模块联邦', '微前端'],
        '能设计大型应用的状态管理架构', '能理解模块联邦和微前端方案', '能设计可扩展的组件库和设计系统'),
    ];
  }

  // ========== 工程化与部署 ==========
  private moduleEngineering(): Partial<KnowledgePoint>[] {
    const m = 'engineering';
    return [
      this.kp('ENG-001', 'Git 版本控制', 'engineering', m, '版本控制', 'P0', 1, 45,
        '掌握 Git 基本命令：init/clone/add/commit/push/pull/branch/merge。理解工作区/暂存区/仓库的概念。学会解决冲突。',
        [], ['Git基础', '分支管理', '合并冲突'],
        '能使用 Git 基本命令', '能管理分支', '能解决合并冲突'),
      this.kp('ENG-002', 'TypeScript 类型系统', 'engineering', m, '类型系统', 'P1', 2, 50,
        '掌握 TypeScript 基础类型、接口、泛型、联合类型、交叉类型、类型守卫、声明文件。理解 tsconfig 配置。',
        ['JS-001', 'JS-004'], ['TypeScript', '泛型', '类型守卫'],
        '能写 TypeScript 基本类型', '能使用泛型和接口', '能编写类型安全的代码'),
      this.kp('ENG-003', '测试 (Vitest/React Testing Library)', 'engineering', m, '测试', 'P2', 3, 50,
        '掌握单元测试、集成测试、E2E 测试的概念。学会使用 Vitest 编写和运行测试。掌握 React Testing Library 的渲染和断言。',
        ['ENG-002', 'REACT-003'], ['Vitest', 'React Testing Library', 'TDD'],
        '能写基本的单元测试', '能测试 React 组件', '能理解测试覆盖率'),
      this.kp('ENG-004', 'CI/CD 基础', 'engineering', m, 'DevOps', 'P2', 3, 30,
        '理解 CI/CD 的核心概念。学会使用 GitHub Actions 配置自动构建、测试、部署流程。了解蓝绿部署。',
        ['ENG-001'], ['CI/CD', 'GitHub Actions', '自动部署'],
        '能理解 CI/CD 流程', '能配置简单的 CI', '能理解部署策略'),
      this.kp('ENG-005', 'Docker 容器化', 'engineering', m, 'DevOps', 'P2', 3, 40,
        '掌握 Dockerfile 编写、docker-compose 配置、多阶段构建。理解镜像分层、容器网络、数据卷。',
        ['NODE-001'], ['Dockerfile', 'docker-compose', '镜像分层'],
        '能编写 Dockerfile', '能使用 docker-compose', '能优化镜像大小'),
      this.kp('ENG-006', '代码规范与 ESLint', 'engineering', m, '代码质量', 'P1', 1, 20,
        '掌握 ESLint 和 Prettier 的配置和使用。理解代码规范对团队协作的重要性。学会 husky + lint-staged。',
        ['ENG-002'], ['ESLint', 'Prettier', 'husky'],
        '能配置 ESLint 规则', '能使用 Prettier 格式化', '能配置 pre-commit hook'),
      this.kp('ENG-007', 'Monorepo 管理', 'engineering', m, '工程化', 'P2', 3, 30,
        '理解 Monorepo 的优势和挑战。掌握 pnpm workspaces、turbo repo、项目引用配置。学会共享代码管理。',
        ['ENG-001', 'ENG-002'], ['pnpm workspaces', 'Monorepo', '共享包'],
        '能配置 Monorepo 项目', '能管理跨包依赖', '能设计共享包结构'),
    ];
  }

  // ========== AI + 现代开发 ==========
  private moduleAIModern(): Partial<KnowledgePoint>[] {
    const m = 'ai-modern';
    return [
      this.kp('AI-001', 'Prompt Engineering 基础', 'ai', m, 'Prompt', 'P0', 1, 30,
        '掌握 Prompt 的结构化设计：角色设定、上下文提供、任务描述、输出格式、约束条件。理解 Chain-of-Thought。',
        [], ['Prompt结构', '角色设定', 'CoT'],
        '能写出清晰的 Prompt', '能使用角色设定', '能使用思维链提示'),
      this.kp('AI-002', 'Vibe Coding 范式', 'ai', m, '开发范式', 'P0', 1, 25,
        '理解 Vibe Coding 的概念、流程和最佳实践。掌握氛围描述、AI 辅助生成、人工审查的协作模式。',
        ['AI-001', 'REACT-002'], ['Vibe Coding', '人机协作', 'AI辅助开发'],
        '能描述氛围生成代码', '能审查 AI 生成的代码', '能建立高效的 AI 协作流'),
      this.kp('AI-003', 'AI Agent 开发基础', 'ai', m, 'Agent', 'P3', 3, 50,
        '理解 AI Agent 的架构（感知-思考-行动循环）。掌握 Tool Calling、Function Calling、Agent Orchestration。',
        ['AI-001', 'JS-010'], ['AI Agent', 'Tool Calling', 'Agent编排'],
        '能理解 Agent 工作原理', '能实现基本的 Function Calling', '能设计多 Agent 协作'),
      this.kp('AI-004', 'LLM API 集成', 'ai', m, 'API', 'P1', 2, 35,
        '掌握 OpenAI SDK 的使用：chat completions、streaming、embedding。理解 token 计算和成本优化。',
        ['NODE-007', 'AI-001'], ['OpenAI SDK', 'Streaming', 'Token管理'],
        '能调用 LLM API', '能实现流式响应', '能优化 token 使用'),
      this.kp('AI-005', 'RAG 应用开发', 'ai', m, '高级', 'P3', 3, 50,
        '理解 RAG (检索增强生成) 的原理。掌握 Embedding、向量数据库、文档分块、检索策略。',
        ['AI-004', 'NODE-010'], ['RAG', 'Embedding', '向量数据库'],
        '能理解 RAG 架构', '能实现文档嵌入和检索', '能优化检索效果'),
      this.kp('AI-006', '代码生成最佳实践', 'ai', m, '开发', 'P1', 2, 30,
        '掌握利用 AI 生成高质量代码的技巧。学会审查和验证 AI 输出。理解 AI 代码的局限性（幻觉、安全风险）。',
        ['AI-001', 'REACT-002'], ['AI代码生成', '代码审查', '幻觉检测'],
        '能使用 AI 辅助编码', '能识别 AI 生成的幻觉', '能验证 AI 输出的正确性'),
      this.kp('AI-007', 'AI 辅助调试', 'ai', m, '开发', 'P1', 2, 25,
        '学会利用 AI 定位和修复 Bug。掌握错误分析 Prompt 技巧。理解 AI 调试的边界。',
        ['AI-001', 'JS-012'], ['AI调试', '错误分析', '修复建议'],
        '能用 AI 分析错误信息', '能验证 AI 修复方案', '能结合上下文调试'),
    ];
  }
}

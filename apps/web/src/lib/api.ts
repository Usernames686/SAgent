export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1';

// Simple in-memory token store (fallback)
let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
}

function persistTokens(access: string, refresh: string) {
  try {
    const stored = localStorage.getItem('sagent-auth');
    if (!stored) return;
    const parsed = JSON.parse(stored);
    parsed.state = {
      ...(parsed.state || {}),
      accessToken: access,
      refreshToken: refresh,
      isAuthenticated: true,
    };
    localStorage.setItem('sagent-auth', JSON.stringify(parsed));
  } catch {}
}

function clearPersistedAuth() {
  accessToken = null;
  refreshToken = null;
  try {
    const stored = localStorage.getItem('sagent-auth');
    if (!stored) return;
    const parsed = JSON.parse(stored);
    parsed.state = {
      ...(parsed.state || {}),
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    };
    localStorage.setItem('sagent-auth', JSON.stringify(parsed));
  } catch {}
  try {
    window.dispatchEvent(new Event('sagent-auth-expired'));
  } catch {}
}

export function getAccessToken() {
  // 优先使用内存中的 token，否则从 localStorage 读取
  if (accessToken) return accessToken;
  try {
    const stored = localStorage.getItem('sagent-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.accessToken || null;
    }
  } catch {}
  return null;
}

function getRefreshToken() {
  if (refreshToken) return refreshToken;
  try {
    const stored = localStorage.getItem('sagent-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.refreshToken || null;
    }
  } catch {}
  return null;
}

async function refreshAccessTokenOnce(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (response.ok) {
      const json = await response.json();
      // 统一解包：后端返回 {code, message, data, ...}
      const body = (json && typeof json === 'object' && 'code' in json && 'data' in json) ? json.data : json;
      if (!body?.accessToken || !body?.refreshToken) return false;
      const nextAccessToken = String(body.accessToken);
      const nextRefreshToken = String(body.refreshToken);
      accessToken = nextAccessToken;
      refreshToken = nextRefreshToken;
      persistTokens(nextAccessToken, nextRefreshToken);
      return true;
    }
  } catch {}
  return false;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessTokenOnce().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

interface RequestConfig extends RequestInit {
  token?: string;
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { token, ...fetchConfig } = config;
  const authToken = token || getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchConfig,
    headers,
  });

  // If 401, try to refresh token
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed && getAccessToken()) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchConfig,
        headers,
      });
    }
    if (response.status === 401) {
      clearPersistedAuth();
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const errMsg = (error as Record<string, unknown>).message || `HTTP ${response.status}`;
    throw new Error(typeof errMsg === 'string' ? errMsg : `HTTP ${response.status}`);
  }

  const json = await response.json();
  // 统一解包：后端 ResponseInterceptor 返回 { code, message, data, meta }
  // 如果存在 data 字段且 code === 0，直接返回 data（即业务数据）
  if (json && typeof json === 'object' && 'code' in json && 'data' in json) {
    if (json.code !== 0) {
      throw new Error(json.message || `业务错误 code=${json.code}`);
    }
    return json.data as T;
  }
  // 兼容非标准响应（直接返回原始数据）
  return json as T;
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; nickname: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  refresh: (rt: string) =>
    request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }),

  githubOAuth: (code: string) =>
    request('/auth/oauth/github', { method: 'POST', body: JSON.stringify({ code }) }),
};

// Generic API helpers
export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'GET', token }),
  post: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), token }),
  put: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), token }),
  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'DELETE', token }),
};

// User API
export const userApi = {
  getMe: (token?: string) => api.get('/users/me', token),
  updateMe: (data: { nickname?: string; avatarUrl?: string }, token?: string) =>
    api.put('/users/me', data, token),
};

// Exercise API
export const exerciseApi = {
  list: (params?: { page?: number; limit?: number; difficulty?: number; language?: string }, token?: string) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.difficulty) searchParams.set('difficulty', String(params.difficulty));
    if (params?.language) searchParams.set('language', params.language);
    const query = searchParams.toString();
    return api.get(`/exercises${query ? `?${query}` : ''}`, token);
  },
  getById: (id: string, token?: string) => api.get(`/exercises/${id}`, token),
  submit: (id: string, data: { code: string; language: string }, token?: string) =>
    api.post(`/exercises/${id}/submit`, data, token),
  run: (id: string, data: { code: string; language: string; input: string }, token?: string) =>
    api.post(`/exercises/${id}/run`, data, token),
  submissions: (id: string, params?: { page?: number; limit?: number }, token?: string) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return api.get(`/exercises/${id}/submissions${query ? `?${query}` : ''}`, token);
  },
};

// Learning Path API
export const learningPathApi = {
  getMyPaths: (token?: string) => api.get('/learning-paths/me', token),
  generate: (data: { goal: string; timeline: string; commitment: string }, token?: string) =>
    api.post('/learning-paths/generate', data, token),
  adjust: (id: string, data: { reason: string; preferences?: Record<string, unknown> }, token?: string) =>
    api.put(`/learning-paths/${id}/adjust`, data, token),
  getProgress: (id: string, token?: string) => api.get(`/learning-paths/${id}/progress`, token),
};

// Agent API
export const agentApi = {
  health: (token?: string) =>
    api.get('/agent/health', token),
  chat: (data: { message: string; sessionId?: string; context?: { currentCode?: string } }, token?: string) =>
    api.post('/agent/chat', data, token),
  evaluate: (data: { code: string; exerciseDescription?: string }, token?: string) =>
    api.post('/agent/evaluate', data, token),
  debug: (data: { code: string; error: string; logs?: string }, token?: string) =>
    api.post('/agent/debug', data, token),
  vibe: (data: { vibe: string; requirements: string; constraints?: string }, token?: string) =>
    api.post('/agent/vibe', data, token),
};

// Vibe Learning API
export const vibeLearningApi = {
  startSession: (data: { nodeId?: string }, token?: string) =>
    api.post('/vibe-learning/session', data, token),
  getSession: (id: string, token?: string) =>
    api.get(`/vibe-learning/session/${id}`, token),
  switchMode: (data: { sessionId: string; mode: string }, token?: string) =>
    api.post('/vibe-learning/switch-mode', data, token),
  submitQuiz: (data: { sessionId: string; answers: { questionId: string; selectedOptionId: string }[] }, token?: string) =>
    api.post('/vibe-learning/submit-quiz', data, token),
  submitCoding: (data: { sessionId: string; code: string }, token?: string) =>
    api.post('/vibe-learning/submit-coding', data, token),
  chat: (data: { sessionId: string; message: string }, token?: string) =>
    api.post('/vibe-learning/chat', data, token),
  getProgress: (token?: string) =>
    api.get('/vibe-learning/progress', token),
  /** ★ 新增：提交学习反馈 */
  submitFeedback: (data: { sessionId: string; type: 'difficulty' | 'pace' | 'content' | 'emotion'; value: string; comment?: string }, token?: string) =>
    api.post('/vibe-learning/feedback', data, token),
  /** ★ 新增：触发个性化调整 */
  personalize: (data: { sessionId?: string }, token?: string) =>
    api.post('/vibe-learning/personalize', data, token),
  /** ★ 新增：推荐知识点 */
  recommend: (data: { limit?: number }, token?: string) =>
    api.post('/vibe-learning/recommend', data, token),
  /** ★ Phase 3: 提交练习代码（4级验证评分） */
  submitExercise: (data: { nodeId: string; code: string; hintsUsed?: number }, token?: string) =>
    api.post('/vibe-learning/exercise/submit', data, token),
  /** ★ Phase 3: 获取练习提示 */
  getExerciseHint: (data: { nodeId: string; currentHintLevel?: number }, token?: string) =>
    api.post('/vibe-learning/exercise/hint', data, token),
  /** ★ Phase 3: 沙箱运行代码 */
  runSandbox: (data: { code: string; input?: string }, token?: string) =>
    api.post('/vibe-learning/sandbox/run', data, token),
  /** ★ Phase 3: 沙箱健康检查 */
  sandboxHealth: (token?: string) =>
    api.get('/vibe-learning/sandbox/health', token),

  // ── Phase 4: Vibe Coding 特色学习模式 ──

  /** 获取 Vibe Coding 预设目标和标签 */
  getVibePresets: (token?: string) =>
    api.get('/vibe-learning/vibe-lab/presets', token),
  /** 氛围生成代码 */
  vibeGenerate: (data: { goal: string; vibe: string; techStack?: string; iterations?: number; nodeId?: string; useLocalTemplate?: boolean }, token?: string) =>
    api.post('/vibe-learning/vibe-generate', data, token),

  /** 获取 Bug 修复挑战列表 */
  getBugChallenges: (nodeId?: string, token?: string) => {
    const query = nodeId ? `?nodeId=${nodeId}` : '';
    return api.get(`/vibe-learning/bug-challenge${query}`, token);
  },
  /** 获取单个 Bug 挑战 */
  getBugChallenge: (id: string, token?: string) =>
    api.get(`/vibe-learning/bug-challenge/${id}`, token),
  /** 提交 Bug 修复 */
  submitBugFix: (data: { challengeId: string; fixedCode: string; timeUsed: number; hintsUsed: number }, token?: string) =>
    api.post('/vibe-learning/bug-challenge/submit', data, token),
  /** 获取 Bug 挑战提示 */
  getBugHint: (data: { challengeId: string; hintIndex: number }, token?: string) =>
    api.post('/vibe-learning/bug-challenge/hint', data, token),

  /** 获取代码评审题目列表 */
  getReviewChallenges: (nodeId?: string, token?: string) => {
    const query = nodeId ? `?nodeId=${nodeId}` : '';
    return api.get(`/vibe-learning/review-challenge${query}`, token);
  },
  /** 获取单个评审题目 */
  getReviewChallenge: (id: string, token?: string) =>
    api.get(`/vibe-learning/review-challenge/${id}`, token),
  /** 提交代码评审 */
  submitReview: (data: { challengeId: string; findings: Array<{ line: number; description: string; severity: 'error' | 'warning' | 'info' }> }, token?: string) =>
    api.post('/vibe-learning/review-challenge/submit', data, token),

  // ── Phase 5 Step 37b: 间隔重复（SM-2） ──

  /** 获取今日待复习知识点 + 队列统计 */
  getSpacedRepetitionQueue: (token?: string) =>
    api.get('/vibe-learning/spaced-repetition', token),
  /** 提交复习结果（quality 0-5） */
  reportReviewResult: (data: { nodeId: string; quality: number }, token?: string) =>
    api.post('/vibe-learning/spaced-repetition/report', data, token),
  /** 基于分数提交复习结果（0-100 自动映射为 quality） */
  reportReviewByScore: (data: { nodeId: string; score: number }, token?: string) =>
    api.post('/vibe-learning/spaced-repetition/report-by-score', data, token),
  /** 获取复习队列统计概览 */
  getSpacedRepetitionStats: (token?: string) =>
    api.get('/vibe-learning/spaced-repetition/stats', token),
  /** 为新通过的知识点安排首次复习 */
  scheduleFirstReview: (data: { nodeId: string }, token?: string) =>
    api.post('/vibe-learning/spaced-repetition/schedule-first', data, token),

  // ── Phase 5 Step 38: 错题回顾系统 ──

  /** 记录一道错题 */
  recordError: (data: {
    nodeId: string;
    questionId: string;
    questionContent?: string;
    userAnswer: string;
    correctAnswer: string;
    errorType?: 'concept' | 'logic' | 'syntax' | 'careless';
    explanation?: string;
    sourceType?: 'quiz' | 'exercise' | 'assessment';
    originalScore?: number;
  }, token?: string) =>
    api.post('/vibe-learning/error-review', data, token),

  /** 获取错题列表（支持筛选） */
  getErrorList: (params?: {
    nodeId?: string;
    errorType?: string;
    reviewed?: boolean;
    limit?: number;
    offset?: number;
  }, token?: string) => {
    const searchParams = new URLSearchParams();
    if (params?.nodeId) searchParams.set('nodeId', params.nodeId);
    if (params?.errorType) searchParams.set('errorType', params.errorType);
    if (params?.reviewed !== undefined) searchParams.set('reviewed', String(params.reviewed));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return api.get(`/vibe-learning/error-review${query ? `?${query}` : ''}`, token);
  },

  /** 获取未回顾的错题列表 */
  getUnreviewedErrors: (limit?: number, token?: string) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get(`/vibe-learning/error-review/unreviewed${query}`, token);
  },

  /** 按知识点聚合错题 */
  getErrorsByNode: (token?: string) =>
    api.get('/vibe-learning/error-review/by-node', token),

  /** 获取错题统计概览 */
  getErrorStats: (token?: string) =>
    api.get('/vibe-learning/error-review/stats', token),

  /** 标记错题已回顾 */
  markErrorReviewed: (id: string, data: { passed: boolean }, token?: string) =>
    api.post(`/vibe-learning/error-review/${id}/review`, data, token),

  /** 重置错题为未回顾（重新练习） */
  resetErrorForRePractice: (id: string, token?: string) =>
    api.post(`/vibe-learning/error-review/${id}/re-practice`, {}, token),

  /** 重置知识点下所有错题 */
  resetNodeErrors: (data: { nodeId: string }, token?: string) =>
    api.post('/vibe-learning/error-review/reset-node', data, token),

  /** 推荐薄弱知识点 */
  recommendWeakNodes: (limit?: number, token?: string) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get(`/vibe-learning/error-review/recommend${query}`, token);
  },

  // ── Phase 5 Step 39: 掌握度热力图 ──

  /** 获取掌握度热力图数据 */
  getProgressHeatmap: (moduleConfig: Record<string, { name: string; nodeIds: string[] }>, token?: string) =>
    api.post('/vibe-learning/progress/heatmap', { moduleConfig }, token),

  // ── Phase 5 Step 40: 学习建议推荐引擎 ──

  /** 获取个性化学习建议 */
  getLearningAdvice: (token?: string) =>
    api.get('/vibe-learning/advice', token),

  // ── Phase 5 Step 41: 进度仪表盘增强 ──

  /** 获取增强仪表盘数据 */
  getEnhancedDashboard: (
    phases: Array<{
      id: string;
      name: string;
      priority: string;
      modules: Array<{ nodeIds: string[] }>;
    }>,
    token?: string,
  ) =>
    api.post('/vibe-learning/progress/enhanced-dashboard', { phases }, token),
};

// Assessment API
export const assessmentApi = {
  /** 获取初始诊断试题 */
  getInitialQuestions: (token?: string) =>
    api.get('/assessment/questions', token),
  /** 提交答案并获取下一题 */
  submitAnswer: (data: { sessionId: string; questionId: string; answerIndex: number }, token?: string) =>
    api.post('/assessment/submit', data, token),
  /** 获取最近诊断结果 */
  getResult: (token?: string) =>
    api.get('/assessment/result', token),
};

// Knowledge Points API
export const knowledgePointApi = {
  /** 获取知识点列表 */
  list: (params?: { domain?: string; module?: string }, token?: string) => {
    const searchParams = new URLSearchParams();
    if (params?.domain) searchParams.set('domain', params.domain);
    if (params?.module) searchParams.set('module', params.module);
    const query = searchParams.toString();
    return api.get(`/knowledge-points${query ? `?${query}` : ''}`, token);
  },
  /** 获取单个知识点 */
  get: (nodeId: string, token?: string) =>
    api.get(`/knowledge-points/${nodeId}`, token),
  /** 获取前置知识点 */
  getPrerequisites: (nodeId: string, token?: string) =>
    api.get(`/knowledge-points/${nodeId}/prerequisites`, token),
  /** 获取后续知识点 */
  getDependents: (nodeId: string, token?: string) =>
    api.get(`/knowledge-points/${nodeId}/dependents`, token),
  /** 按领域获取知识点概览 */
  getDomainOverview: (domain: string, token?: string) =>
    api.get(`/knowledge-points/${domain}`, token),
  /** 获取知识点练习题 */
  getExercises: (nodeId: string, token?: string) =>
    api.get(`/knowledge-points/${nodeId}/exercises`, token),
};

// Preview API
export const previewApi = {
  render: (code: string, token?: string) =>
    api.post<{ html: string }>('/preview/render', { code }, token),
};

// Badge API
export const badgeApi = {
  /** 获取所有成就 */
  list: (category?: string, token?: string) => {
    const query = category ? `?category=${category}` : '';
    return api.get(`/badges${query}`, token);
  },
  /** 获取我的成就 */
  getMyBadges: (token?: string) =>
    api.get('/badges/me', token),
  /** 初始化成就种子数据 */
  seed: (token?: string) =>
    api.post('/badges/seed', {}, token),
  /** 检查并自动颁发成就 */
  checkAndAward: (
    data: {
      knowledgeCompleted?: number;
      exercisePassed?: number;
      streakDays?: number;
      vibeCount?: number;
      communityPosts?: number;
      pathCompleted?: boolean;
    },
    token?: string,
  ) => api.post('/badges/check', data, token),
  /** 获取成就进度 */
  getProgress: (token?: string) =>
    api.get('/badges/progress', token),
};

// Bookmark API
export const bookmarkApi = {
  /** 获取我的收藏 */
  list: (type?: string, token?: string) => {
    const query = type ? `?type=${type}` : '';
    return api.get(`/bookmarks${query}`, token);
  },
  /** 添加收藏 */
  add: (data: { targetId: string; targetType: string; title?: string; note?: string }, token?: string) =>
    api.post('/bookmarks', data, token),
  /** 取消收藏 */
  remove: (data: { targetId: string; targetType: string }, token?: string) =>
    request('/bookmarks', { method: 'DELETE', body: JSON.stringify(data), token }),
};

// History API
export const historyApi = {
  /** 获取浏览历史 */
  list: (params?: { type?: string; page?: number; limit?: number }, token?: string) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return api.get(`/history${query ? `?${query}` : ''}`, token);
  },
  /** 记录浏览 */
  record: (data: { targetId: string; targetType: string; title?: string }, token?: string) =>
    api.post('/history', data, token),
  /** 清除历史 */
  clear: (targetType?: string, token?: string) =>
    request('/history', { method: 'DELETE', body: JSON.stringify({ targetType }), token }),
};

// Community API
export const communityApi = {
  /** 帖子列表 */
  listPosts: (params?: { type?: string; page?: number; limit?: number }, token?: string) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return api.get(`/community/posts${query ? `?${query}` : ''}`, token);
  },
  /** 帖子详情 */
  getPost: (id: string, token?: string) =>
    api.get(`/community/posts/${id}`, token),
  /** 创建帖子 */
  createPost: (data: { type?: string; title: string; content: string; tags?: string[] }, token?: string) =>
    api.post('/community/posts', data, token),
  /** 获取评论 */
  getComments: (postId: string, page?: number, token?: string) => {
    const query = page ? `?page=${page}` : '';
    return api.get(`/community/posts/${postId}/comments${query}`, token);
  },
  /** 添加评论 */
  addComment: (postId: string, data: { content: string; parentId?: string }, token?: string) =>
    api.post(`/community/posts/${postId}/comments`, data, token),
  /** 点赞 */
  like: (postId: string, token?: string) =>
    api.post(`/community/posts/${postId}/like`, {}, token),
};

// Research Content API
export const researchApi = {
  list: (params?: { category?: string; search?: string; tag?: string }, token?: string) => {
    const searchParams = new URLSearchParams();
    if (params?.category && params.category !== 'all') searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tag) searchParams.set('tag', params.tag);
    const query = searchParams.toString();
    return api.get(`/content/research${query ? `?${query}` : ''}`, token);
  },
  get: (id: string, token?: string) =>
    api.get(`/content/research/${id}`, token),
};

// Dataset API
export const datasetApi = {
  list: (token?: string) =>
    api.get('/datasets', token),
  downloads: (token?: string) =>
    api.get('/datasets/downloads', token),
  get: (id: string, token?: string) =>
    api.get(`/datasets/${id}`, token),
  preview: (id: string, limit?: number, token?: string) =>
    api.get(`/datasets/${id}/preview${limit ? `?limit=${limit}` : ''}`, token),
  downloadUrl: (id: string) =>
    `${API_BASE}/datasets/${id}/download`,
};

// Project Practice API
export const projectApi = {
  list: (token?: string) =>
    api.get('/projects', token),
  openSourceCatalog: (nodeId?: string, token?: string) =>
    api.get(`/projects/open-source/catalog${nodeId ? `?nodeId=${encodeURIComponent(nodeId)}` : ''}`, token),
  get: (nodeId: string, token?: string) =>
    api.get(`/projects/${nodeId}`, token),
  submissions: (nodeId: string, token?: string) =>
    api.get(`/projects/${nodeId}/submissions`, token),
  submit: (
    nodeId: string,
    data: { repositoryUrl?: string; previewUrl?: string; notes?: string; checklist?: string[] },
    token?: string,
  ) =>
    api.post(`/projects/${nodeId}/submit`, data, token),
};

// Analytics API
export const analyticsApi = {
  /** 个人统计仪表盘 */
  getDashboard: (token?: string) =>
    api.get('/analytics/dashboard', token),
  /** 全局统计 */
  getGlobalStats: (token?: string) =>
    api.get('/analytics/global', token),
  /** 行为数据深度指标 */
  getBehaviorMetrics: (since?: string, token?: string) =>
    api.get(`/analytics/behavior${since ? `?since=${encodeURIComponent(since)}` : ''}`, token),
};

// Evolution API
export const evolutionApi = {
  getStrategies: (token?: string) =>
    api.get('/agent/evolution/strategies', token),
  getStats: (token?: string) =>
    api.get('/agent/evolution/stats', token),
  getReport: (token?: string) =>
    api.get('/agent/evolution/report', token),
  getVariants: (token?: string) =>
    api.get('/agent/evolution/variants', token),
  getExperiments: (token?: string) =>
    api.get('/agent/evolution/experiments', token),
  getLogs: (experimentId?: string, token?: string) =>
    api.get(`/agent/evolution/logs${experimentId ? `?experimentId=${encodeURIComponent(experimentId)}` : ''}`, token),
  getMetrics: (token?: string) =>
    api.get('/agent/evolution/metrics', token),
  getWeeklyReport: (token?: string) =>
    api.get('/agent/evolution/weekly-report', token),
};

// Interview API — 接入后端 InterviewAgent
export const interviewApi = {
  /** 生成面试题（调用 InterviewAgent.generateQuestions） */
  generateQuestions: (data: { role: string; count?: number; focusAreas?: string[] }, token?: string) =>
    api.post('/agent/interview/questions', data, token),
  /** 评估面试答案并生成报告（调用 InterviewAgent.evaluateAnswer + generateReport） */
  evaluateAnswers: (data: {
    role: string;
    questions: Array<{ id: string; type: string; difficulty: number; question: string; expectedAnswer?: string; hints?: string[]; timeLimit?: number }>;
    answers: Array<{ questionId: string; answer: string; score?: number; feedback?: string }>;
  }, token?: string) =>
    api.post('/agent/interview/evaluate', data, token),
};

// Behavior Tracking SDK — 前端行为采集（对应需求文档 5.1 节）
// 覆盖页面交互/编码/提交/AI/路径/评估等采集域
export const behaviorApi = {
  /** 单条事件上报 */
  track: (data: {
    eventType: string;
    eventName: string;
    payload?: Record<string, unknown>;
    sessionId?: string;
    userAgent?: string;
    language?: string;
  }, token?: string) =>
    api.post('/behavior/track', data, token),
  /** 批量事件上报（适用于离线聚合后一次性提交） */
  trackBatch: (data: {
    events: Array<{ eventType: string; eventName: string; payload?: Record<string, unknown>; sessionId?: string }>;
  }, token?: string) =>
    api.post('/behavior/track/batch', data, token),
  /** 个人行为查询 */
  getMyEvents: (limit?: number, token?: string) =>
    api.get(`/behavior/me${limit ? `?limit=${limit}` : ''}`, token),
  /** 全局行为指标 */
  getMetrics: (since?: string, token?: string) =>
    api.get(`/behavior/metrics${since ? `?since=${since}` : ''}`, token),
};

/** 轻量前端埋点 SDK — 在组件中直接调用 track() 即可，自动附带 token */
export function createTracker(getToken: () => string | undefined) {
  const queue: Array<{ eventType: string; eventName: string; payload?: Record<string, unknown>; ts: number }> = [];
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  const FLUSH_INTERVAL = 10000; // 10 秒批量上报

  function ensureTimer() {
    if (flushTimer) return;
    flushTimer = setInterval(() => {
      if (queue.length === 0) return;
      const batch = queue.splice(0, queue.length);
      behaviorApi.trackBatch({ events: batch.map(e => ({ eventType: e.eventType, eventName: e.eventName, payload: { ...e.payload, ts: e.ts } })) }, getToken()).catch(() => {});
    }, FLUSH_INTERVAL);
  }

  return {
    /** 触发埋点（入队，定时批量上报） */
    track(eventType: string, eventName: string, payload?: Record<string, unknown>): void {
      queue.push({ eventType, eventName, payload, ts: Date.now() });
      ensureTimer();
      if (queue.length >= 20) {
        const batch = queue.splice(0, queue.length);
        behaviorApi.trackBatch({ events: batch.map(e => ({ eventType: e.eventType, eventName: e.eventName, payload: { ...e.payload, ts: e.ts } })) }, getToken()).catch(() => {});
      }
    },
    /** 页面访问 */
    pageView(path: string, title?: string): void {
      this.track('page_view', `page_view.${path}`, { path, title, durationMs: 0 });
    },
    /** 编码行为 */
    coding(action: 'type' | 'delete' | 'paste' | 'complete', payload?: Record<string, unknown>): void {
      this.track('coding', `code.${action}`, payload);
    },
    /** 代码提交 */
    codeSubmit(exerciseId: string, result: 'pass' | 'fail', payload?: Record<string, unknown>): void {
      this.track('code_submit', 'code.submit', { exerciseId, result, ...payload });
    },
    /** AI 交互 */
    aiInteraction(action: 'chat' | 'evaluate' | 'debug' | 'vibe', rating?: number): void {
      this.track('ai_interaction', `ai.${action}`, { rating });
    },
    /** 学习路径 */
    pathEvent(action: 'enter' | 'progress' | 'complete' | 'abandon', pathId: string, payload?: Record<string, unknown>): void {
      this.track('path', `path.${action}`, { pathId, ...payload });
    },
    /** 立即刷盘（页面卸载时调用） */
    flush(): void {
      if (queue.length === 0) return;
      const batch = queue.splice(0, queue.length);
      // 使用 sendBeacon 避免页面卸载时请求被取消
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
        navigator.sendBeacon(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'}/behavior/track/batch`, blob);
      } else {
        behaviorApi.trackBatch({ events: batch }, getToken()).catch(() => {});
      }
    },
  };
}

// Sandbox API
export const sandboxApi = {
  /** 运行代码 */
  run: (data: { code: string; language: string; input?: string }, token?: string) =>
    api.post('/sandbox/execute', data, token),
  /** 支持语言 */
  languages: (token?: string) =>
    api.get('/sandbox/languages', token),
  /** 沙箱健康检查 */
  health: (token?: string) =>
    api.get('/sandbox/health', token),
};

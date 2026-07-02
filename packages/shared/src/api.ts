export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  meta: ResponseMeta;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  page?: number;
  pageSize?: number;
  total?: number;
}

export interface ApiError {
  code: number;
  message: string;
  errors?: FieldError[];
  meta: Pick<ResponseMeta, 'requestId' | 'timestamp'>;
}

export interface FieldError {
  field: string;
  message: string;
}

export const ErrorCode = {
  SUCCESS: 0,
  // 认证与授权 1000-1999
  TOKEN_EXPIRED: 1001,
  TOKEN_INVALID: 1002,
  PERMISSION_DENIED: 1003,
  UNAUTHORIZED: 1004,
  // 用户相关 2000-2999
  USER_NOT_FOUND: 2001,
  USER_EMAIL_EXISTS: 2002,
  PASSWORD_WRONG: 2003,
  USER_DISABLED: 2004,
  // 内容相关 3000-3999
  COURSE_NOT_FOUND: 3001,
  EXERCISE_NOT_FOUND: 3002,
  KNOWLEDGE_POINT_NOT_FOUND: 3003,
  LEARNING_PATH_NOT_FOUND: 3004,
  SUBMISSION_NOT_FOUND: 3005,
  // 执行相关 4000-4999
  EXEC_TIMEOUT: 4001,
  MEMORY_LIMIT: 4002,
  SANDBOX_ERROR: 4003,
  // AI 相关 5000-5999
  AGENT_UNAVAILABLE: 5001,
  LLM_TIMEOUT: 5002,
  LLM_RATE_LIMIT: 5003,
  AGENT_INVALID_RESPONSE: 5004,
  // 系统相关 9000-9999
  INTERNAL_ERROR: 9001,
  SERVICE_UNAVAILABLE: 9002,
  BAD_REQUEST: 9003,
  VALIDATION_ERROR: 9004,
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorMessages: Record<number, string> = {
  [ErrorCode.SUCCESS]: 'success',
  [ErrorCode.TOKEN_EXPIRED]: 'Token 已过期',
  [ErrorCode.TOKEN_INVALID]: 'Token 无效',
  [ErrorCode.PERMISSION_DENIED]: '权限不足',
  [ErrorCode.UNAUTHORIZED]: '未授权访问',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_EMAIL_EXISTS]: '邮箱已注册',
  [ErrorCode.PASSWORD_WRONG]: '密码错误',
  [ErrorCode.USER_DISABLED]: '用户已被禁用',
  [ErrorCode.COURSE_NOT_FOUND]: '课程不存在',
  [ErrorCode.EXERCISE_NOT_FOUND]: '练习不存在',
  [ErrorCode.KNOWLEDGE_POINT_NOT_FOUND]: '知识点不存在',
  [ErrorCode.LEARNING_PATH_NOT_FOUND]: '学习路径不存在',
  [ErrorCode.SUBMISSION_NOT_FOUND]: '提交记录不存在',
  [ErrorCode.EXEC_TIMEOUT]: '执行超时',
  [ErrorCode.MEMORY_LIMIT]: '内存超限',
  [ErrorCode.SANDBOX_ERROR]: '沙箱执行错误',
  [ErrorCode.AGENT_UNAVAILABLE]: 'Agent 不可用',
  [ErrorCode.LLM_TIMEOUT]: 'LLM 响应超时',
  [ErrorCode.LLM_RATE_LIMIT]: 'LLM 请求频率超限',
  [ErrorCode.AGENT_INVALID_RESPONSE]: 'Agent 返回异常',
  [ErrorCode.INTERNAL_ERROR]: '内部错误',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务不可用',
  [ErrorCode.BAD_REQUEST]: '请求参数错误',
  [ErrorCode.VALIDATION_ERROR]: '数据校验失败',
};

// 工具函数
export function success<T>(data: T, meta?: Partial<ResponseMeta>): ApiResponse<T> {
  return {
    code: ErrorCode.SUCCESS,
    message: ErrorMessages[ErrorCode.SUCCESS],
    data,
    meta: {
      requestId: '',
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function error(code: number, message?: string, errors?: FieldError[]): ApiError {
  return {
    code,
    message: message || ErrorMessages[code] || '未知错误',
    errors,
    meta: { requestId: '', timestamp: new Date().toISOString() },
  };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): ApiResponse<T[]> {
  return success(items, { page, pageSize, total });
}

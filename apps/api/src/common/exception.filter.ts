import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

// 错误码定义（本地副本，避免跨 rootDir 引用）
export const AppErrorCode = {
  SUCCESS: 0,
  TOKEN_EXPIRED: 1001,
  TOKEN_INVALID: 1002,
  PERMISSION_DENIED: 1003,
  UNAUTHORIZED: 1004,
  USER_NOT_FOUND: 2001,
  USER_EMAIL_EXISTS: 2002,
  PASSWORD_WRONG: 2003,
  USER_DISABLED: 2004,
  COURSE_NOT_FOUND: 3001,
  EXERCISE_NOT_FOUND: 3002,
  KNOWLEDGE_POINT_NOT_FOUND: 3003,
  LEARNING_PATH_NOT_FOUND: 3004,
  SUBMISSION_NOT_FOUND: 3005,
  EXEC_TIMEOUT: 4001,
  MEMORY_LIMIT: 4002,
  SANDBOX_ERROR: 4003,
  AGENT_UNAVAILABLE: 5001,
  LLM_TIMEOUT: 5002,
  LLM_RATE_LIMIT: 5003,
  AGENT_INVALID_RESPONSE: 5004,
  INTERNAL_ERROR: 9001,
  SERVICE_UNAVAILABLE: 9002,
  BAD_REQUEST: 9003,
  VALIDATION_ERROR: 9004,
} as const;

const AppErrorMessages: Record<number, string> = {
  [AppErrorCode.SUCCESS]: 'success',
  [AppErrorCode.TOKEN_EXPIRED]: 'Token 已过期',
  [AppErrorCode.TOKEN_INVALID]: 'Token 无效',
  [AppErrorCode.PERMISSION_DENIED]: '权限不足',
  [AppErrorCode.UNAUTHORIZED]: '未授权访问',
  [AppErrorCode.USER_NOT_FOUND]: '用户不存在',
  [AppErrorCode.USER_EMAIL_EXISTS]: '邮箱已注册',
  [AppErrorCode.PASSWORD_WRONG]: '密码错误',
  [AppErrorCode.USER_DISABLED]: '用户已被禁用',
  [AppErrorCode.COURSE_NOT_FOUND]: '课程不存在',
  [AppErrorCode.EXERCISE_NOT_FOUND]: '练习不存在',
  [AppErrorCode.KNOWLEDGE_POINT_NOT_FOUND]: '知识点不存在',
  [AppErrorCode.LEARNING_PATH_NOT_FOUND]: '学习路径不存在',
  [AppErrorCode.SUBMISSION_NOT_FOUND]: '提交记录不存在',
  [AppErrorCode.EXEC_TIMEOUT]: '执行超时',
  [AppErrorCode.MEMORY_LIMIT]: '内存超限',
  [AppErrorCode.SANDBOX_ERROR]: '沙箱执行错误',
  [AppErrorCode.AGENT_UNAVAILABLE]: 'Agent 不可用',
  [AppErrorCode.LLM_TIMEOUT]: 'LLM 响应超时',
  [AppErrorCode.LLM_RATE_LIMIT]: 'LLM 请求频率超限',
  [AppErrorCode.AGENT_INVALID_RESPONSE]: 'Agent 返回异常',
  [AppErrorCode.INTERNAL_ERROR]: '内部错误',
  [AppErrorCode.SERVICE_UNAVAILABLE]: '服务不可用',
  [AppErrorCode.BAD_REQUEST]: '请求参数错误',
  [AppErrorCode.VALIDATION_ERROR]: '数据校验失败',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: number = AppErrorCode.INTERNAL_ERROR;
    let message = AppErrorMessages[AppErrorCode.INTERNAL_ERROR];
    let errors: { field: string; message: string }[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      const statusToCode: Record<number, number> = {
        [HttpStatus.BAD_REQUEST]: AppErrorCode.BAD_REQUEST,
        [HttpStatus.UNAUTHORIZED]: AppErrorCode.UNAUTHORIZED,
        [HttpStatus.FORBIDDEN]: AppErrorCode.PERMISSION_DENIED,
        [HttpStatus.NOT_FOUND]: AppErrorCode.USER_NOT_FOUND,
        [HttpStatus.CONFLICT]: AppErrorCode.USER_EMAIL_EXISTS,
        [HttpStatus.TOO_MANY_REQUESTS]: AppErrorCode.LLM_RATE_LIMIT,
        [HttpStatus.REQUEST_TIMEOUT]: AppErrorCode.EXEC_TIMEOUT,
      };

      code = statusToCode[status] || AppErrorCode.INTERNAL_ERROR;
      message = exception.message;

      if (typeof exResponse === 'object' && exResponse !== null) {
        const resp = exResponse as Record<string, unknown>;
        if (resp.message && Array.isArray(resp.message)) {
          errors = (resp.message as string[]).map((msg: string) => ({
            field: '',
            message: msg,
          }));
          message = AppErrorMessages[AppErrorCode.VALIDATION_ERROR];
          code = AppErrorCode.VALIDATION_ERROR;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      message = process.env.NODE_ENV === 'production'
        ? AppErrorMessages[AppErrorCode.INTERNAL_ERROR]
        : exception.message;
    }

    response.status(status).json({
      code,
      message,
      data: null,
      errors,
      meta: {
        requestId: (request as any).id || '',
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}

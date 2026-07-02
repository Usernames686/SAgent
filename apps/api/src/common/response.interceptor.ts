import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// 本地响应类型定义（避免跨 rootDir 引用）
interface ResponseMeta {
  requestId?: string;
  timestamp?: string;
  page?: number;
  pageSize?: number;
  total?: number;
}

interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  meta?: ResponseMeta;
}

function success<T>(data: T, meta?: ResponseMeta): ApiResponse<T> {
  return {
    code: 0,
    message: 'success',
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<{ id?: string }>();

    return next.handle().pipe(
      map((data) => {
        // 如果 controller 已经返回了标准格式，不再包装
        if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
          return data;
        }

        // 列表响应保持原业务结构，避免丢失 summary 等页面需要的字段。
        if (data && typeof data === 'object' && 'items' in data && 'total' in data) {
          return success(data, {
            requestId: request.id || '',
            timestamp: new Date().toISOString(),
            page: 'page' in data ? Number(data.page) || 1 : undefined,
            pageSize: 'pageSize' in data ? Number(data.pageSize) || 20 : undefined,
            total: Number(data.total) || 0,
          });
        }

        return success(data, {
          requestId: request.id || '',
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }
}

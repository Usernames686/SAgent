import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * 自定义限流 Guard
 * 基于 @nestjs/throttler，对 API 请求频率进行限制
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('请求过于频繁，请稍后再试');
  }
}

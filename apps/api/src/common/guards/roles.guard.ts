import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * 角色权限 Guard
 * 配合 @Roles() 装饰器使用，检查当前用户是否具有所需角色
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取路由所需的角色列表
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果没有设置角色要求，则允许访问
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: { userId: string; role?: string } }>();

    if (!user) {
      throw new ForbiddenException('权限不足');
    }

    // 从数据库获取用户角色（通过 JWT payload 中的 userId）
    // 这里简化为从 request.user.role 读取
    const userRole = user.role || 'student';

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException('权限不足，需要角色: ' + requiredRoles.join(', '));
    }

    return true;
  }
}

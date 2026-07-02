import { SetMetadata } from '@nestjs/common';

/**
 * 角色装饰器元数据 Key
 */
export const ROLES_KEY = 'roles';

/**
 * 角色装饰器
 * 用法: @Roles('admin', 'teacher')
 * 配合 RolesGuard 使用
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserService } from '../user/user.service';
import { EmailService } from './email.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('邮箱已注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await this.userService.create({
      email: dto.email,
      passwordHash,
      nickname: dto.nickname,
      verificationToken,
    });

    // 发送验证邮件（异步，不阻塞注册响应）
    this.emailService.sendVerificationEmail(dto.email, verificationToken).catch(err => {
      this.logger.warn(`验证邮件发送失败: ${(err as Error).message}`);
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens, assessmentRequired: true };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    await this.userService.updateLastActive(user.id);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'sagent-refresh-secret',
      });
      const tokens = await this.generateTokens(payload.sub, payload.email, payload.role);
      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token 无效');
    }
  }

  async validateUser(userId: string) {
    return this.userService.findById(userId);
  }

  // ===== 邮箱验证 =====

  /** 验证邮箱 token */
  async verifyEmail(token: string) {
    const user = await this.userService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('验证链接无效或已过期');
    }

    await this.userService.updateEmailVerified(user.id, true);
    await this.userService.clearVerificationToken(user.id);

    return { success: true, message: '邮箱验证成功' };
  }

  /** 重新发送验证邮件 */
  async resendVerification(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }
    if (user.emailVerified) {
      throw new BadRequestException('邮箱已验证，无需重复验证');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.userService.updateVerificationToken(user.id, verificationToken);

    await this.emailService.sendVerificationEmail(email, verificationToken);

    return { success: true, message: '验证邮件已重新发送' };
  }

  // ===== 密码重置 =====

  /** 请求密码重置 */
  async requestPasswordReset(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // 安全考虑：不透露用户是否存在
      return { success: true, message: '如果该邮箱已注册，您将收到重置邮件' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 分钟有效
    await this.userService.updateResetToken(user.id, resetToken, expiresAt);

    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return { success: true, message: '如果该邮箱已注册，您将收到重置邮件' };
  }

  /** 执行密码重置 */
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userService.findByResetToken(token);
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new BadRequestException('重置链接无效或已过期');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userService.updatePassword(user.id, passwordHash);
    await this.userService.clearResetToken(user.id);

    return { success: true, message: '密码重置成功' };
  }

  async githubOAuth(code: string) {
    // GitHub OAuth 流程
    // 1. 用 code 换取 access_token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new UnauthorizedException('GitHub OAuth 授权失败');
    }

    // 2. 获取用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const githubUser = await userResponse.json() as { id: number; login: string; email?: string; avatar_url?: string };

    // 3. 查找或创建用户
    const email = githubUser.email || `${githubUser.login}@github.com`;
    let user = await this.userService.findByEmail(email);
    if (!user) {
      user = await this.userService.create({
        email,
        passwordHash: '',
        nickname: githubUser.login,
      });
    }

    await this.userService.updateLastActive(user.id);
    const tokens = await this.generateTokens(user.id, email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  private async generateTokens(userId: string, email: string, role?: string) {
    const payload = { sub: userId, email, role: role || 'student' };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'sagent-refresh-secret',
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}

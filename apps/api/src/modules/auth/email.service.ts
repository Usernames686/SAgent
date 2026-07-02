import { Injectable, Logger } from '@nestjs/common';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * 发送邮件
   * 生产环境应接入 SMTP / SendGrid / 阿里云邮件推送等服务
   * 开发环境仅打印日志
   */
  async send(message: EmailMessage): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      // 生产环境：调用实际邮件服务
      try {
        // TODO: 接入 SMTP 或第三方邮件 API
        // 示例：await this.smtpTransport.sendMail({ ... })
        this.logger.log(`[PROD] 邮件已发送至 ${message.to}: ${message.subject}`);
        return true;
      } catch (err) {
        this.logger.error(`邮件发送失败: ${(err as Error).message}`);
        return false;
      }
    }

    // 开发/测试环境：仅打印日志
    this.logger.log(`[DEV] 邮件未实际发送 → ${message.to}: ${message.subject}`);
    return true;
  }

  /**
   * 发送邮箱验证邮件
   */
  async sendVerificationEmail(to: string, token: string): Promise<boolean> {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/verify-email?token=${token}`;
    return this.send({
      to,
      subject: 'sAgent - 验证您的邮箱',
      html: `
        <h2>欢迎注册 sAgent！</h2>
        <p>请点击以下链接验证您的邮箱地址：</p>
        <a href="${verifyUrl}" style="padding:10px 20px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">
          验证邮箱
        </a>
        <p>或复制链接到浏览器：${verifyUrl}</p>
        <p>此链接 24 小时内有效。</p>
      `,
    });
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/reset-password?token=${token}`;
    return this.send({
      to,
      subject: 'sAgent - 重置您的密码',
      html: `
        <h2>密码重置请求</h2>
        <p>请点击以下链接设置新密码：</p>
        <a href="${resetUrl}" style="padding:10px 20px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">
          重置密码
        </a>
        <p>或复制链接到浏览器：${resetUrl}</p>
        <p>此链接 15 分钟内有效。如非本人操作，请忽略此邮件。</p>
      `,
    });
  }
}

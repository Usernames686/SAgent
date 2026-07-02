import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CodeSandboxService } from './code-sandbox.service';

@ApiTags('代码沙箱')
@Controller('sandbox')
export class SandboxController {
  constructor(private readonly sandboxService: CodeSandboxService) {}

  @Post('execute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '执行代码' })
  async execute(
    @Body()
    body: {
      code: string;
      language: string;
      input?: string;
      timeoutMs?: number;
    },
  ) {
    if (!this.sandboxService.isLanguageSupported(body.language)) {
      return {
        success: false,
        error: `不支持的编程语言: ${body.language}。支持的语言: ${this.sandboxService.getSupportedLanguages().join(', ')}`,
      };
    }

    return this.sandboxService.execute({
      code: body.code,
      language: body.language,
      input: body.input,
      timeoutMs: body.timeoutMs,
    });
  }

  @Get('languages')
  @ApiOperation({ summary: '获取支持的语言列表' })
  getLanguages() {
    return {
      languages: this.sandboxService.getSupportedLanguages(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: '沙箱健康检查' })
  async health() {
    return this.sandboxService.healthCheck();
  }
}

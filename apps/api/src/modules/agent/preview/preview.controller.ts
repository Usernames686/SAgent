import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PreviewService } from './preview.service';

@ApiTags('预览')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('preview')
export class PreviewController {
  constructor(private readonly previewService: PreviewService) {}

  @Post('render')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '渲染 React 组件为 HTML' })
  async render(@Body() body: { code: string }) {
    const html = await this.previewService.renderComponent(body.code);
    return { html };
  }
}

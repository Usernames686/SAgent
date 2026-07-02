import { Controller, Get, Header, Param, Query, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DatasetService } from './dataset.service';

@ApiTags('数据集')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('datasets')
export class DatasetController {
  constructor(private readonly datasetService: DatasetService) {}

  @Get()
  @ApiOperation({ summary: '数据集列表' })
  findAll() {
    return this.datasetService.findAll();
  }

  @Get('downloads')
  @ApiOperation({ summary: '数据集导出记录' })
  listDownloads(@Request() req: { user: { userId: string } }) {
    return this.datasetService.listDownloads(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '数据集详情' })
  findOne(@Param('id') id: string) {
    return this.datasetService.findOne(id);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: '数据集样本预览' })
  preview(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.datasetService.preview(id, limit ? parseInt(limit, 10) : undefined);
  }

  @Get(':id/download')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '下载数据集样本文件' })
  async download(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const file = this.datasetService.download(id);
    await this.datasetService.recordDownload(req.user.userId, id, file);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.body);
  }
}

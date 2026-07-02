import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { EvolutionService, StudentProfile } from './evolution.service';
import { EvolutionEngineService } from './evolution-engine.service';
import { EvolutionDataCollector } from './evolution-data-collector.service';
import { EvolutionDimension } from './ab-test.service';

@ApiTags('进化引擎')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agent/evolution')
export class EvolutionController {
  constructor(
    private readonly evolutionService: EvolutionService,
    private readonly engineService: EvolutionEngineService,
    private readonly dataCollector: EvolutionDataCollector,
  ) {}

  @Get('strategies')
  @ApiOperation({ summary: '获取所有教学策略' })
  async getStrategies() {
    return this.evolutionService.getStrategies();
  }

  @Get('stats')
  @ApiOperation({ summary: '获取策略统计数据' })
  async getStats() {
    return this.evolutionService.getStrategyStats();
  }

  @Post('select')
  @ApiOperation({ summary: '根据学生档案选择最优策略' })
  async selectStrategy(@Body() body: StudentProfile) {
    return this.evolutionService.getRecommendationReport(body);
  }

  @Post('record')
  @ApiOperation({ summary: '记录学习结果' })
  async recordResult(@Body() body: { student: StudentProfile; strategyId: string; score: number }) {
    this.evolutionService.recordResult(body.student, body.strategyId, body.score);
    return { success: true };
  }

  // ====== 进化引擎 A/B 测试管线 ======

  @Get('report')
  @ApiOperation({ summary: '进化引擎状态报告' })
  getReport() {
    return this.engineService.getEvolutionReport();
  }

  @Get('variants')
  @ApiOperation({ summary: '获取所有策略变体' })
  getVariants() {
    return this.engineService.getVariants();
  }

  @Get('experiments')
  @ApiOperation({ summary: '获取所有 A/B 实验' })
  getExperiments() {
    return this.engineService.getAbTestService().getExperiments();
  }

  @Get('experiments/:id')
  @ApiOperation({ summary: '获取实验详情' })
  getExperiment(@Param('id') id: string) {
    return this.engineService.getAbTestService().getExperiment(id);
  }

  @Post('experiments')
  @Roles('admin')
  @ApiOperation({ summary: '创建并启动进化实验' })
  createExperiment(@Body() body: { name: string; description: string; dimension: EvolutionDimension; variantId: string }) {
    return this.engineService.triggerEvolution(body);
  }

  @Post('experiments/:id/check')
  @ApiOperation({ summary: '检查实验状态并推进' })
  checkExperiment(@Param('id') id: string) {
    return this.engineService.checkExperiment(id);
  }

  @Post('experiments/:id/approve')
  @Roles('admin')
  @ApiOperation({ summary: '人工审核确认全量发布' })
  approveExperiment(@Param('id') id: string, @Body() body: { reviewer: string }) {
    return this.engineService.approveExperiment(id, body.reviewer);
  }

  @Post('experiments/:id/rollback')
  @Roles('admin')
  @ApiOperation({ summary: '一键回滚实验' })
  rollbackExperiment(@Param('id') id: string) {
    return this.engineService.rollbackToStable(id);
  }

  @Get('logs')
  @ApiOperation({ summary: '进化审计日志' })
  getLogs(@Query('experimentId') experimentId?: string) {
    return this.engineService.getEvolutionLog(experimentId);
  }

  // ====== 数据收集 & 自动进化 ======

  @Get('metrics')
  @ApiOperation({ summary: '收集知识点学习指标' })
  getMetrics() {
    return this.dataCollector.collectMetrics();
  }

  @Post('auto-evolve')
  @ApiOperation({ summary: '基于数据自动触发进化' })
  autoEvolve() {
    return this.dataCollector.autoEvolve();
  }

  @Get('weekly-report')
  @ApiOperation({ summary: '每周进化报告' })
  weeklyReport() {
    return this.dataCollector.weeklyReport();
  }
}

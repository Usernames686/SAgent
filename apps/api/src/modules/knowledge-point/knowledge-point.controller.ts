import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { KnowledgePointService } from './knowledge-point.service';

@ApiTags('知识点')
@Controller('knowledge-points')
export class KnowledgePointController {
  constructor(private readonly kpService: KnowledgePointService) {}

  @Get()
  @ApiOperation({ summary: '知识点列表' })
  async findAll(
    @Query('domain') domain?: string,
    @Query('module') module?: string,
  ) {
    return this.kpService.findAll({ domain, module });
  }

  @Get(':nodeId')
  @ApiOperation({ summary: '知识点详情' })
  async findOne(@Param('nodeId') nodeId: string) {
    return this.kpService.findById(nodeId);
  }

  @Get(':nodeId/prerequisites')
  @ApiOperation({ summary: '前置知识点' })
  async getPrerequisites(@Param('nodeId') nodeId: string) {
    return this.kpService.getPrerequisites(nodeId);
  }

  @Get(':nodeId/dependents')
  @ApiOperation({ summary: '后续知识点' })
  async getDependents(@Param('nodeId') nodeId: string) {
    return this.kpService.getDependents(nodeId);
  }
}

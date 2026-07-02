import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ResearchService } from './research.service';

@ApiTags('研究内容')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('content/research')
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Get()
  @ApiOperation({ summary: '研究文章列表' })
  findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
  ) {
    return this.researchService.findAll({ category, search, tag });
  }

  @Get(':id')
  @ApiOperation({ summary: '研究文章详情' })
  findOne(@Param('id') id: string) {
    return this.researchService.findOne(id);
  }
}

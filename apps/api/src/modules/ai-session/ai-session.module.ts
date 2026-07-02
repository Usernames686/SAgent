import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSession } from '../../entities/ai-session.entity';
import { AiSessionService } from './ai-session.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiSession])],
  providers: [AiSessionService],
  exports: [AiSessionService],
})
export class AiSessionModule {}

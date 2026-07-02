import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BehaviorEventEntity } from '../../entities/behavior-event.entity';
import { BehaviorTrackingService } from './behavior-tracking.service';
import { BehaviorController } from './behavior.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BehaviorEventEntity])],
  providers: [BehaviorTrackingService],
  controllers: [BehaviorController],
  exports: [BehaviorTrackingService],
})
export class BehaviorModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { LearningPath } from '../../entities/learning-path.entity';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';
import { IrtAssessmentService } from './irt-assessment.service';
import { UserModule } from '../user/user.module';
import { LearningPathModule } from '../learning-path/learning-path.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, LearningPath]),
    UserModule,
    LearningPathModule,
  ],
  controllers: [AssessmentController],
  providers: [AssessmentService, IrtAssessmentService],
  exports: [AssessmentService, IrtAssessmentService],
})
export class AssessmentModule {}

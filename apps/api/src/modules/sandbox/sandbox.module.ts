import { Module } from '@nestjs/common';
import { CodeSandboxService } from './code-sandbox.service';
import { SandboxController } from './sandbox.controller';

@Module({
  controllers: [SandboxController],
  providers: [CodeSandboxService],
  exports: [CodeSandboxService],
})
export class SandboxModule {}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/response.interceptor';
import { GlobalExceptionFilter } from './common/exception.filter';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api/v1');

    app.enableCors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
      credentials: true,
    });

    // 全局响应格式 & 异常过滤器
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Swagger 仅在非生产环境挂载（生产环境跳过文档生成以加速启动）
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('sAgent API')
        .setDescription('自我进化多智能体个性化学习氛围编程平台 API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('docs', app, document);
    }

    const port = process.env.PORT || 4001;
    await app.listen(port);
    console.log(`sAgent API running on http://localhost:${port}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Swagger docs at http://localhost:${port}/docs`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as NodeJS.ErrnoException)?.code;
    console.error('\n[FATAL] Failed to start sAgent API:');
    console.error(msg);
    if (code === 'EADDRINUSE') {
      console.error('\nPort is already in use. Kill the old process and retry:');
      console.error('  for /f "tokens=5" %a in (\'netstat -ano ^| findstr :4001 ^| findstr LISTENING\') do taskkill /F /PID %a');
    }
    process.exit(1);
  }
}
bootstrap();

import './load-env';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { PlatformMiddleware } from './common/middleware/platform.middleware';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['https://kinhoservice.site', 'https://kinhoservice.site:8443'],
  });

  // X-Platform 中间件
  const platformMiddleware = new PlatformMiddleware();
  app.use(platformMiddleware.use.bind(platformMiddleware));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    exceptionFactory: (errors) => {
      const messages = errors.map(err => Object.values(err.constraints || {}).join(', ')).filter(Boolean);
      return new (require('@nestjs/common').BadRequestException)(messages.join('; ') || '输入数据格式错误');
    },
  }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const prisma = app.get(PrismaService);
  app.useGlobalGuards(
    new PermissionsGuard(app.get(Reflector), prisma, app.get(JwtService)),
    new RolesGuard(app.get(Reflector), app.get(JwtService)),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Machinery Guard API')
      .setDescription('工程机械售后服务管理系统 API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '127.0.0.1');
}
bootstrap();

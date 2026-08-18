import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy - required when behind nginx reverse proxy
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security: Helmet middleware
  app.use(helmet());

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  });

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_TTL) || 60000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      message: 'Demasiadas solicitudes desde esta IP, intente nuevamente más tarde',
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Ministerial Command Center API')
    .setDescription('Backend API para el Centro de Comando Ministerial - MTTSIA')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('documents', 'Document management')
    .addTag('departments', 'Department management')
    .addTag('entities', 'Entity management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║  🚀 Ministerial Command Center API                  ║
  ║  ✅ Server running on: http://localhost:${port}      ║
  ║  📚 API Documentation: http://localhost:${port}/api/docs  ║
  ║  🏢 Organization: MTTSIA - Guinea Ecuatorial        ║
  ╚══════════════════════════════════════════════════════╝
  `);
}

bootstrap();

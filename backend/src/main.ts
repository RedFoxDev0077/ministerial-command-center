import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

/**
 * Refuse to start on a misconfigured secret rather than booting with an unset
 * or placeholder signing key. A weak JWT_SECRET means forgeable access tokens,
 * which in this system means forgeable Minister authority.
 */
function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = process.env[key];

    if (!value) {
      errors.push(`${key} is not set. Generate one with: openssl rand -hex 64`);
      continue;
    }

    if (isProduction) {
      if (value.length < 32) {
        errors.push(`${key} is too short (${value.length} chars, need >= 32).`);
      }
      if (/your-|change-in-production|secret-key-here/i.test(value)) {
        errors.push(`${key} still contains a placeholder value from .env.example.`);
      }
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different values.');
  }

  if (isProduction && !process.env.CORS_ORIGIN) {
    errors.push('CORS_ORIGIN must be set explicitly in production.');
  }

  if (errors.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      ['', '❌ Invalid environment configuration:', ...errors.map((e) => `   - ${e}`), ''].join('\n'),
    );
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnvironment();

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

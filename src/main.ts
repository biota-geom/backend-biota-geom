import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EnvVars } from './config/env.validation';
import { AuthConfigService } from './modules/auth/infra/auth-config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /*
   * Without this, ThrottlerGuard's per-IP tracking keys off the proxy's own
   * IP whenever the app runs behind a reverse proxy/load balancer — every
   * request looks like it comes from one client, so the per-IP register/
   * login/refresh limits collapse into one limit shared by everyone.
   * Trusting exactly one hop matches a typical single-proxy deployment.
   */
  app.set('trust proxy', 1);

  const authConfig = app.get(AuthConfigService);

  app.enableCors({
    origin: authConfig.corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Tokens travel via the Authorization header, never cookies, so the
    // browser never needs to send credentials cross-origin.
    credentials: false,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Biota Geom API')
    .setDescription('Backend API for Biota Geom.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const configService = app.get<ConfigService<EnvVars, true>>(ConfigService);
  const port = configService.get('PORT', { infer: true });

  await app.listen(port, '0.0.0.0');
}
void bootstrap();

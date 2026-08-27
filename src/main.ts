import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EnvVars } from './config/env.validation';
import { AuthConfigService } from './modules/auth/infra/auth-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

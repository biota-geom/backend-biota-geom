import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EnvVars } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Biota Geom API')
    .setDescription('Backend API for Biota Geom.')
    .setVersion('0.1.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const configService = app.get<ConfigService<EnvVars, true>>(ConfigService);
  const port = configService.get('PORT', { infer: true });

  await app.listen(port, '0.0.0.0');
}
void bootstrap();

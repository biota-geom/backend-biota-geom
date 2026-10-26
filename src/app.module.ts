import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { EsgMetricsModule } from './modules/esg-metrics/esg-metrics.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { CustomerModule } from './modules/customers/customers.module';
import { IssuingAgenciesModule } from './modules/issuing-agencies/issuing-agencies.module';
import { LicensesModule } from './modules/licenses/licenses.module';
import { SectorsModule } from './modules/sectors/sectors.module';
import { EsgIndicatorsModule } from './modules/esg-indicators/esg-indicators.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CustomerModule,
    SectorsModule,
    EsgMetricsModule,
    EsgIndicatorsModule,
    IssuingAgenciesModule,
    LicensesModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

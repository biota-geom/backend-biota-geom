import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreateCustomEsgMetricUseCase } from './application/use-cases/create-custom-esg-metric.use-case';
import { EsgMetricRepository } from './domain/repositories/esg-metric.repository';
import { PrismaEsgMetricRepository } from './infra/repositories/prisma-esg-metric.repository';
import { EsgMetricsController } from './presentation/controllers/esg-metrics.controller';

@Module({
  imports: [AuthModule],
  controllers: [EsgMetricsController],
  providers: [
    CreateCustomEsgMetricUseCase,
    {
      provide: EsgMetricRepository,
      useClass: PrismaEsgMetricRepository,
    },
  ],
})
export class EsgMetricsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customers/customers.module';
import { GetEsgIndicatorsUseCase } from './application/get-esg-indicators.use-case';
import { SaveEsgIndicatorsUseCase } from './application/save-esg-indicators.use-case';
import { EsgIndicatorRecordRepository } from './domain/esg-indicator-records.repository';
import { PrismaEsgIndicatorRecordRepository } from './infra/prisma-esg-indicator-record.repository';
import { EsgIndicatorsController } from './presentation/esg-indicators.controller';

@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [EsgIndicatorsController],
  providers: [
    {
      provide: EsgIndicatorRecordRepository,
      useClass: PrismaEsgIndicatorRecordRepository,
    },
    GetEsgIndicatorsUseCase,
    SaveEsgIndicatorsUseCase,
  ],
})
export class EsgIndicatorsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customers/customers.module';
import { CreateCustomerIndicatorUseCase } from './application/create-customer-indicator.use-case';
import { GetEsgIndicatorsUseCase } from './application/get-esg-indicators.use-case';
import { SaveEsgIndicatorsUseCase } from './application/save-esg-indicators.use-case';
import { CustomerIndicatorRepository } from './domain/customer-indicators.repository';
import { EsgIndicatorRecordRepository } from './domain/esg-indicator-records.repository';
import { PrismaCustomerIndicatorRepository } from './infra/prisma-customer-indicator.repository';
import { PrismaEsgIndicatorRecordRepository } from './infra/prisma-esg-indicator-record.repository';
import { CustomerIndicatorsController } from './presentation/customer-indicators.controller';
import { EsgIndicatorsController } from './presentation/esg-indicators.controller';

@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [EsgIndicatorsController, CustomerIndicatorsController],
  providers: [
    {
      provide: EsgIndicatorRecordRepository,
      useClass: PrismaEsgIndicatorRecordRepository,
    },
    {
      provide: CustomerIndicatorRepository,
      useClass: PrismaCustomerIndicatorRepository,
    },
    GetEsgIndicatorsUseCase,
    SaveEsgIndicatorsUseCase,
    CreateCustomerIndicatorUseCase,
  ],
})
export class EsgIndicatorsModule {}

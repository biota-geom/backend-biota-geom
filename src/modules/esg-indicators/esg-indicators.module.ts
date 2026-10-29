import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customers/customers.module';
import { CreateCustomerIndicatorUseCase } from './application/create-customer-indicator.use-case';
import { GetEsgIndicatorsSummaryUseCase } from './application/get-esg-indicators-summary.use-case';
import { GetEsgIndicatorsUseCase } from './application/get-esg-indicators.use-case';
import { SaveEsgIndicatorsUseCase } from './application/save-esg-indicators.use-case';
import { CustomerIndicatorRepository } from './domain/customer-indicators.repository';
import { EsgIndicatorRecordRepository } from './domain/esg-indicator-records.repository';
import { PrismaCustomerIndicatorRepository } from './infra/prisma-customer-indicator.repository';
import { PrismaEsgIndicatorRecordRepository } from './infra/prisma-esg-indicator-record.repository';
import { CustomerIndicatorsController } from './presentation/customer-indicators.controller';
import { EsgIndicatorsController } from './presentation/esg-indicators.controller';

@Module({
  /*
   * Both sides of the cycle need forwardRef: this module imports CustomerModule
   * and CustomerModule imports this one back for the executive report. With it
   * on one side only, whichever file is evaluated first sees the other as
   * undefined and Nest refuses to build the graph.
   */
  imports: [AuthModule, forwardRef(() => CustomerModule)],
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
    GetEsgIndicatorsSummaryUseCase,
  ],
  // The executive report reuses the same summary the dashboard block shows,
  // so both always print the same numbers for the same moment.
  exports: [GetEsgIndicatorsSummaryUseCase],
})
export class EsgIndicatorsModule {}

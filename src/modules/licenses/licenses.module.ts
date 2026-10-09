import { Module } from '@nestjs/common';
import { FileStorageModule } from '../../common/storage/file-storage.module';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customers/customers.module';
import { EsgMetricsModule } from '../esg-metrics/esg-metrics.module';
import { IssuingAgenciesModule } from '../issuing-agencies/issuing-agencies.module';
import { CreateLicenseUseCase } from './application/create-license.use-case';
import { AddLicenseConditionsUseCase } from './application/add-license-conditions.use-case';
import { GetLicenseConditionsComplianceUseCase } from './application/get-license-conditions-compliance.use-case';
import { ListLicenseConditionsByCustomerUseCase } from './application/list-license-conditions-by-customer.use-case';
import { ListLicensesByCustomerUseCase } from './application/list-licenses-by-customer.use-case';
import { LicenseConditionRepository } from './domain/license-conditions.repository';
import { LicenseRepository } from './domain/licenses.repository';
import { PrismaLicenseConditionRepository } from './infra/prisma-license-condition.repository';
import { PrismaLicenseRepository } from './infra/prisma-license.repository';
import { LicenseConditionsController } from './presentation/license-conditions.controller';
import { LicensesController } from './presentation/licenses.controller';
import { CreateLicenseConditionUseCase } from './application/create-license-conditions.use-case';
import { GetLicenseDetailsUseCase } from './application/get-license-details.use-case';
import { UpdateLicenseConditionUseCase } from './application/update-license-conditions.use-case';
import { DeleteLicenseConditionUseCase } from './application/delete-license-condition.use-case';
@Module({
  imports: [
    AuthModule,
    CustomerModule,
    EsgMetricsModule,
    IssuingAgenciesModule,
    FileStorageModule,
  ],
  controllers: [LicensesController, LicenseConditionsController],
  providers: [
    { provide: LicenseRepository, useClass: PrismaLicenseRepository },
    {
      provide: LicenseConditionRepository,
      useClass: PrismaLicenseConditionRepository,
    },
    CreateLicenseUseCase,
    AddLicenseConditionsUseCase,
    ListLicensesByCustomerUseCase,
    CreateLicenseConditionUseCase,
    GetLicenseDetailsUseCase,
    UpdateLicenseConditionUseCase,
    DeleteLicenseConditionUseCase,
    ListLicenseConditionsByCustomerUseCase,
    GetLicenseConditionsComplianceUseCase,
  ],
})
export class LicensesModule {}

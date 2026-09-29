import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customers/customers.module';
import { IssuingAgenciesModule } from '../issuing-agencies/issuing-agencies.module';
import { CreateLicenseUseCase } from './application/create-license.use-case';
import { AddLicenseConditionsUseCase } from './application/add-license-conditions.use-case';
import { ListLicenseConditionsByCustomerUseCase } from './application/list-license-conditions-by-customer.use-case';
import { ListLicensesByCustomerUseCase } from './application/list-licenses-by-customer.use-case';
import { LicenseConditionRepository } from './domain/license-conditions.repository';
import { LicenseRepository } from './domain/licenses.repository';
import { PrismaLicenseConditionRepository } from './infra/prisma-license-condition.repository';
import { PrismaLicenseRepository } from './infra/prisma-license.repository';
import { licenseDocumentStorageProvider } from './infra/storage/license-document-storage.provider';
import { LocalDiskLicenseDocumentStorage } from './infra/storage/local-disk-license-document-storage';
import { S3LicenseDocumentStorage } from './infra/storage/s3-license-document-storage';
import { StorageConfigService } from './infra/storage/storage-config.service';
import { LicenseConditionsController } from './presentation/license-conditions.controller';
import { LicensesController } from './presentation/licenses.controller';

@Module({
  imports: [AuthModule, CustomerModule, IssuingAgenciesModule],
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
    ListLicenseConditionsByCustomerUseCase,
    StorageConfigService,
    LocalDiskLicenseDocumentStorage,
    S3LicenseDocumentStorage,
    licenseDocumentStorageProvider,
  ],
})
export class LicensesModule {}

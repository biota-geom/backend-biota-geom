import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customers/customers.module';
import { IssuingAgenciesModule } from '../issuing-agencies/issuing-agencies.module';
import { CreateLicenseUseCase } from './application/create-license.use-case';
import { LicenseRepository } from './domain/licenses.repository';
import { PrismaLicenseRepository } from './infra/prisma-license.repository';
import { licenseDocumentStorageProvider } from './infra/storage/license-document-storage.provider';
import { LocalDiskLicenseDocumentStorage } from './infra/storage/local-disk-license-document-storage';
import { S3LicenseDocumentStorage } from './infra/storage/s3-license-document-storage';
import { StorageConfigService } from './infra/storage/storage-config.service';
import { LicensesController } from './presentation/licenses.controller';

@Module({
  imports: [AuthModule, CustomerModule, IssuingAgenciesModule],
  controllers: [LicensesController],
  providers: [
    { provide: LicenseRepository, useClass: PrismaLicenseRepository },
    CreateLicenseUseCase,
    StorageConfigService,
    LocalDiskLicenseDocumentStorage,
    S3LicenseDocumentStorage,
    licenseDocumentStorageProvider,
  ],
})
export class LicensesModule {}

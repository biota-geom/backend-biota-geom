import { Provider } from '@nestjs/common';
import { LicenseDocumentStorage } from '../../domain/license-document-storage';
import { LocalDiskLicenseDocumentStorage } from './local-disk-license-document-storage';
import { S3LicenseDocumentStorage } from './s3-license-document-storage';
import { StorageConfigService } from './storage-config.service';

/*
 * Picks the concrete storage adapter from STORAGE_DRIVER at startup. Nothing
 * downstream (the use case, the controller) knows or cares which one is
 * active — see LicenseDocumentStorage.
 */
export const licenseDocumentStorageProvider: Provider = {
  provide: LicenseDocumentStorage,
  useFactory: (
    config: StorageConfigService,
    s3Storage: S3LicenseDocumentStorage,
    localStorage: LocalDiskLicenseDocumentStorage,
  ): LicenseDocumentStorage =>
    config.driver === 's3' ? s3Storage : localStorage,
  inject: [
    StorageConfigService,
    S3LicenseDocumentStorage,
    LocalDiskLicenseDocumentStorage,
  ],
};

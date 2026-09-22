import { FactoryProvider } from '@nestjs/common';
import { licenseDocumentStorageProvider } from './license-document-storage.provider';
import { LocalDiskLicenseDocumentStorage } from './local-disk-license-document-storage';
import { S3LicenseDocumentStorage } from './s3-license-document-storage';
import { StorageConfigService } from './storage-config.service';

describe('licenseDocumentStorageProvider', () => {
  const { useFactory } = licenseDocumentStorageProvider as FactoryProvider;
  const s3Storage = {
    upload: jest.fn(),
  } as unknown as S3LicenseDocumentStorage;
  const localStorage = {
    upload: jest.fn(),
  } as unknown as LocalDiskLicenseDocumentStorage;

  it('picks the S3 adapter when STORAGE_DRIVER=s3', () => {
    const config = { driver: 's3' } as StorageConfigService;

    expect(useFactory(config, s3Storage, localStorage)).toBe(s3Storage);
  });

  it('picks the local disk adapter when STORAGE_DRIVER=local', () => {
    const config = { driver: 'local' } as StorageConfigService;

    expect(useFactory(config, s3Storage, localStorage)).toBe(localStorage);
  });
});

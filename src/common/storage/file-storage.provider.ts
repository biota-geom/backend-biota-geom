import { Provider } from '@nestjs/common';
import { FileStorage } from './file-storage';
import { LocalDiskFileStorage } from './local-disk-file-storage';
import { S3FileStorage } from './s3-file-storage';
import { StorageConfigService } from './storage-config.service';

export const fileStorageProvider: Provider = {
  provide: FileStorage,
  useFactory: (
    config: StorageConfigService,
    s3Storage: S3FileStorage,
    localStorage: LocalDiskFileStorage,
  ): FileStorage => (config.driver === 's3' ? s3Storage : localStorage),
  inject: [StorageConfigService, S3FileStorage, LocalDiskFileStorage],
};

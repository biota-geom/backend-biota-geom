import { Module } from '@nestjs/common';
import { FileStorage } from './file-storage';
import { fileStorageProvider } from './file-storage.provider';
import { LocalDiskFileStorage } from './local-disk-file-storage';
import { S3FileStorage } from './s3-file-storage';
import { StorageConfigService } from './storage-config.service';

@Module({
  providers: [
    StorageConfigService,
    LocalDiskFileStorage,
    S3FileStorage,
    fileStorageProvider,
  ],
  exports: [FileStorage, StorageConfigService],
})
export class FileStorageModule {}

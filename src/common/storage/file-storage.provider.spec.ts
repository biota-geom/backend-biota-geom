import { FactoryProvider } from '@nestjs/common';
import { fileStorageProvider } from './file-storage.provider';
import { LocalDiskFileStorage } from './local-disk-file-storage';
import { S3FileStorage } from './s3-file-storage';

describe('fileStorageProvider', () => {
  const { useFactory } = fileStorageProvider as FactoryProvider;
  const s3 = { upload: jest.fn() } as unknown as S3FileStorage;
  const local = { upload: jest.fn() } as unknown as LocalDiskFileStorage;

  it('selects S3 when configured', () => {
    expect(useFactory({ driver: 's3' }, s3, local)).toBe(s3);
  });

  it('selects local disk when configured', () => {
    expect(useFactory({ driver: 'local' }, s3, local)).toBe(local);
  });
});

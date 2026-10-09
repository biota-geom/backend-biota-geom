import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../../config/env.validation';
import { StorageConfigService } from './storage-config.service';

describe('StorageConfigService', () => {
  it('reads every storage setting from ConfigService', () => {
    const values: Partial<EnvVars> = {
      STORAGE_DRIVER: 's3',
      APP_BASE_URL: 'http://localhost:3000',
      LOCAL_STORAGE_DIR: './storage',
      AWS_S3_BUCKET: 'bucket',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'key',
      AWS_SECRET_ACCESS_KEY: 'secret',
      AWS_S3_ENDPOINT: 'http://localhost:9000',
      AWS_S3_PUBLIC_URL_BASE: 'https://cdn.example.com',
    };
    const config = {
      get: jest.fn((key: keyof EnvVars) => values[key]),
    } as unknown as ConfigService<EnvVars, true>;
    const service = new StorageConfigService(config);

    expect(service.driver).toBe('s3');
    expect(service.appBaseUrl).toBe('http://localhost:3000');
    expect(service.localStorageDir).toBe('./storage');
    expect(service.s3Bucket).toBe('bucket');
    expect(service.s3Region).toBe('us-east-1');
    expect(service.s3AccessKeyId).toBe('key');
    expect(service.s3SecretAccessKey).toBe('secret');
    expect(service.s3Endpoint).toBe('http://localhost:9000');
    expect(service.s3PublicUrlBase).toBe('https://cdn.example.com');
  });
});

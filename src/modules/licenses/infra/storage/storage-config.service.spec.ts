import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../../../../config/env.validation';
import { StorageConfigService } from './storage-config.service';

function buildService(env: Partial<EnvVars>): StorageConfigService {
  const config = {
    get: jest.fn((key: keyof EnvVars) => env[key]),
  } as unknown as ConfigService<EnvVars, true>;

  return new StorageConfigService(config);
}

describe('StorageConfigService', () => {
  it('exposes the local driver settings', () => {
    const service = buildService({
      STORAGE_DRIVER: 'local',
      APP_BASE_URL: 'http://localhost:3000',
      LOCAL_STORAGE_DIR: './storage',
    });

    expect(service.driver).toBe('local');
    expect(service.appBaseUrl).toBe('http://localhost:3000');
    expect(service.localStorageDir).toBe('./storage');
  });

  it('exposes the S3 settings', () => {
    const service = buildService({
      STORAGE_DRIVER: 's3',
      AWS_S3_BUCKET: 'biota-geom-licenses',
      AWS_REGION: 'sa-east-1',
      AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'secret-example',
      AWS_S3_ENDPOINT: 'http://localhost:9000',
      AWS_S3_PUBLIC_URL_BASE: 'https://cdn.biotageom.com.br',
    });

    expect(service.driver).toBe('s3');
    expect(service.s3Bucket).toBe('biota-geom-licenses');
    expect(service.s3Region).toBe('sa-east-1');
    expect(service.s3AccessKeyId).toBe('AKIAEXAMPLE');
    expect(service.s3SecretAccessKey).toBe('secret-example');
    expect(service.s3Endpoint).toBe('http://localhost:9000');
    expect(service.s3PublicUrlBase).toBe('https://cdn.biotageom.com.br');
  });

  it('leaves the optional S3 settings undefined when they are not configured', () => {
    const service = buildService({ STORAGE_DRIVER: 'local' });

    expect(service.s3Bucket).toBeUndefined();
    expect(service.s3AccessKeyId).toBeUndefined();
    expect(service.s3SecretAccessKey).toBeUndefined();
    expect(service.s3Endpoint).toBeUndefined();
    expect(service.s3PublicUrlBase).toBeUndefined();
  });
});

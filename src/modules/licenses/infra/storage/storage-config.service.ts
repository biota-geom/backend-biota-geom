import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../../../../config/env.validation';

@Injectable()
export class StorageConfigService {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  get driver(): 'local' | 's3' {
    return this.config.get('STORAGE_DRIVER', { infer: true });
  }

  get appBaseUrl(): string {
    return this.config.get('APP_BASE_URL', { infer: true });
  }

  get localStorageDir(): string {
    return this.config.get('LOCAL_STORAGE_DIR', { infer: true });
  }

  get s3Bucket(): string | undefined {
    return this.config.get('AWS_S3_BUCKET', { infer: true });
  }

  get s3Region(): string {
    return this.config.get('AWS_REGION', { infer: true });
  }

  get s3AccessKeyId(): string | undefined {
    return this.config.get('AWS_ACCESS_KEY_ID', { infer: true });
  }

  get s3SecretAccessKey(): string | undefined {
    return this.config.get('AWS_SECRET_ACCESS_KEY', { infer: true });
  }

  get s3Endpoint(): string | undefined {
    return this.config.get('AWS_S3_ENDPOINT', { infer: true });
  }

  get s3PublicUrlBase(): string | undefined {
    return this.config.get('AWS_S3_PUBLIC_URL_BASE', { infer: true });
  }
}

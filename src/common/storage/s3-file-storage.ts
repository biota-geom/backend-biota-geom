import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  FileStorage,
  FileToStore,
  StoredFile,
  StoreFileOptions,
} from './file-storage';
import { StorageConfigService } from './storage-config.service';

function objectName(originalName: string): string {
  return `${randomUUID()}${extname(originalName).toLowerCase()}`;
}

function joinUrl(base: string, path: string): string {
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
}

@Injectable()
export class S3FileStorage implements FileStorage {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfigService) {
    const hasExplicitCredentials =
      this.config.s3AccessKeyId && this.config.s3SecretAccessKey;

    this.client = new S3Client({
      region: this.config.s3Region,
      endpoint: this.config.s3Endpoint,
      forcePathStyle: Boolean(this.config.s3Endpoint),
      credentials: hasExplicitCredentials
        ? {
            accessKeyId: this.config.s3AccessKeyId,
            secretAccessKey: this.config.s3SecretAccessKey,
          }
        : undefined,
    });
  }

  async upload(
    file: FileToStore,
    options: StoreFileOptions,
  ): Promise<StoredFile> {
    const bucket = this.config.s3Bucket;
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET must be set when STORAGE_DRIVER=s3');
    }

    const key = `${options.category}/${options.customerId}/${objectName(file.originalName)}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );

    const url = this.config.s3PublicUrlBase
      ? joinUrl(this.config.s3PublicUrlBase, key)
      : `https://${bucket}.s3.${this.config.s3Region}.amazonaws.com/${key}`;

    return { url };
  }
}

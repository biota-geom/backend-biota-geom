import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  FileAccessUrl,
  FileStorage,
  FileToStore,
  STORAGE_CATEGORIES,
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

export function extractObjectKey(storedUrl: string): string {
  const path = decodeURIComponent(new URL(storedUrl).pathname);
  const keyStart = Math.max(
    ...STORAGE_CATEGORIES.map((category) => path.lastIndexOf(`/${category}/`)),
  );

  if (keyStart !== -1) return path.slice(keyStart + 1);

  return path.replace(/^\/+/, '');
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
    const bucket = this.requireBucket();
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

  async getAccessUrl(storedUrl: string): Promise<FileAccessUrl> {
    const bucket = this.requireBucket();
    const expiresInSeconds = this.config.s3SignedUrlTtlSeconds;

    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: extractObjectKey(storedUrl),
        ResponseContentDisposition: 'inline',
      }),
      { expiresIn: expiresInSeconds },
    );

    return { url, expiresInSeconds };
  }

  private requireBucket(): string {
    const bucket = this.config.s3Bucket;
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET must be set when STORAGE_DRIVER=s3');
    }

    return bucket;
  }
}

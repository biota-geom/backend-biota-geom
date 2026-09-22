import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  FileToStore,
  LicenseDocumentStorage,
  StoredDocument,
} from '../../domain/license-document-storage';
import { StorageConfigService } from './storage-config.service';

function sanitizeFileName(originalName: string): string {
  const extension = originalName.includes('.')
    ? `.${originalName.split('.').pop()}`
    : '';

  return `${randomUUID()}${extension.toLowerCase()}`;
}

function joinUrl(base: string, path: string): string {
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
}

/*
 * STORAGE_DRIVER=s3. Fully wired against @aws-sdk/client-s3 — the only thing
 * missing to go live is real credentials/bucket in the environment (see
 * .env.example). AWS_S3_ENDPOINT + forcePathStyle also make this work
 * unmodified against an S3-compatible service (MinIO, LocalStack) for local
 * testing without touching real AWS.
 */
@Injectable()
export class S3LicenseDocumentStorage implements LicenseDocumentStorage {
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

  async upload(file: FileToStore, customerId: string): Promise<StoredDocument> {
    const bucket = this.config.s3Bucket;
    if (!bucket) {
      // Guarded again here (not just in env.validation.ts) so a
      // programmatically-constructed config can't silently upload to
      // `undefined`.
      throw new Error('AWS_S3_BUCKET must be set when STORAGE_DRIVER=s3');
    }

    const key = `licenses/${customerId}/${sanitizeFileName(file.originalName)}`;

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

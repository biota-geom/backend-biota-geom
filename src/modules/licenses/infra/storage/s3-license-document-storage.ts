import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  DocumentAccessUrl,
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

const KEY_PREFIX = 'licenses/';

/*
 * Recovers the object key from the URL persisted at upload time. The URL may
 * be virtual-hosted (bucket in the host), path-style (bucket in the path, e.g.
 * MinIO) or a CDN base, but every key starts with KEY_PREFIX and the segments
 * after it (customer id, generated file name) never contain it again — so the
 * last occurrence marks where the key begins.
 */
export function extractObjectKey(storedUrl: string): string {
  const path = decodeURIComponent(new URL(storedUrl).pathname);
  const keyStart = path.lastIndexOf(`/${KEY_PREFIX}`);

  if (keyStart !== -1) return path.slice(keyStart + 1);

  // Stryker disable next-line Regex: a URL pathname always starts with "/",
  // so dropping the `^` anchor still strips the same leading run of slashes.
  return path.replace(/^\/+/, '');
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
    const bucket = this.requireBucket();
    const key = `${KEY_PREFIX}${customerId}/${sanitizeFileName(file.originalName)}`;

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

  async getAccessUrl(storedUrl: string): Promise<DocumentAccessUrl> {
    const bucket = this.requireBucket();
    const expiresInSeconds = this.config.s3SignedUrlTtlSeconds;

    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: extractObjectKey(storedUrl),
        // Ask the browser to render the PDF in the tab instead of downloading.
        ResponseContentDisposition: 'inline',
      }),
      { expiresIn: expiresInSeconds },
    );

    return { url, expiresInSeconds };
  }

  private requireBucket(): string {
    const bucket = this.config.s3Bucket;
    if (!bucket) {
      // Guarded again here (not just in env.validation.ts) so a
      // programmatically-constructed config can't silently upload to
      // `undefined`.
      throw new Error('AWS_S3_BUCKET must be set when STORAGE_DRIVER=s3');
    }

    return bucket;
  }
}

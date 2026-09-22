import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import {
  FileToStore,
  LicenseDocumentStorage,
  StoredDocument,
} from '../../domain/license-document-storage';
import { StorageConfigService } from './storage-config.service';

export const LOCAL_STORAGE_URL_PREFIX = 'uploads/licenses';

// Keeps the extension, drops everything else about the original name: it
// only ever reaches the filesystem as part of a URL served back to the
// client, so it must not carry path separators or other unsafe characters.
function sanitizeFileName(originalName: string): string {
  const extension = originalName.includes('.')
    ? `.${originalName.split('.').pop()}`
    : '';

  return `${randomUUID()}${extension.toLowerCase()}`;
}

/*
 * Default storage driver (STORAGE_DRIVER=local, or unset). Files are written
 * under LOCAL_STORAGE_DIR/licenses/<customerId>/ and served back by the
 * static route registered in main.ts, at LOCAL_STORAGE_URL_PREFIX.
 */
@Injectable()
export class LocalDiskLicenseDocumentStorage implements LicenseDocumentStorage {
  constructor(private readonly config: StorageConfigService) {}

  async upload(file: FileToStore, customerId: string): Promise<StoredDocument> {
    const fileName = sanitizeFileName(file.originalName);
    const directory = join(this.config.localStorageDir, 'licenses', customerId);

    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, fileName), file.buffer);

    const url = new URL(
      `${LOCAL_STORAGE_URL_PREFIX}/${customerId}/${fileName}`,
      this.config.appBaseUrl,
    );

    return { url: url.toString() };
  }
}

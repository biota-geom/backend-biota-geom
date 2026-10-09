import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import {
  FileStorage,
  FileToStore,
  DocumentAccessUrl,
  StoredFile,
  StoreFileOptions,
} from './file-storage';
import { StorageConfigService } from './storage-config.service';

export const LOCAL_STORAGE_URL_PREFIX = 'uploads';

export function storedFileName(originalName: string): string {
  const extension = extname(originalName).toLowerCase();
  return `${randomUUID()}${extension}`;
}

@Injectable()
export class LocalDiskFileStorage implements FileStorage {
  constructor(private readonly config: StorageConfigService) {}

  async upload(
    file: FileToStore,
    options: StoreFileOptions,
  ): Promise<StoredFile> {
    const fileName = storedFileName(file.originalName);
    const directory = join(
      this.config.localStorageDir,
      options.category,
      options.customerId,
    );

    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, fileName), file.buffer);

    const url = new URL(
      `${LOCAL_STORAGE_URL_PREFIX}/${options.category}/${options.customerId}/${fileName}`,
      this.config.appBaseUrl,
    );

    return { url: url.toString() };
  }

  getAccessUrl(storedUrl: string): Promise<DocumentAccessUrl> {
    return Promise.resolve({ url: storedUrl, expiresInSeconds: null });
  }
}

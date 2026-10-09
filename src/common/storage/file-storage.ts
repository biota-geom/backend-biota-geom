import { Injectable } from '@nestjs/common';

export interface FileToStore {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export type StorageCategory = 'licenses' | 'documents';

export interface StoreFileOptions {
  category: StorageCategory;
  customerId: string;
}

export interface StoredFile {
  url: string;
}

export interface DocumentAccessUrl {
  url: string;
  expiresInSeconds: number | null;
}

@Injectable()
export abstract class FileStorage {
  abstract upload(
    file: FileToStore,
    options: StoreFileOptions,
  ): Promise<StoredFile>;

  abstract getAccessUrl(storedUrl: string): Promise<DocumentAccessUrl>;
}

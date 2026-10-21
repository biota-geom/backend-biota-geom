import { Injectable } from '@nestjs/common';

export interface FileToStore {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export const STORAGE_CATEGORIES = ['licenses', 'documents'] as const;

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];

export interface StoreFileOptions {
  category: StorageCategory;
  customerId: string;
}

export interface StoredFile {
  url: string;
}

export interface FileAccessUrl {
  url: string;
  expiresInSeconds: number | null;
}

@Injectable()
export abstract class FileStorage {
  abstract upload(
    file: FileToStore,
    options: StoreFileOptions,
  ): Promise<StoredFile>;

  abstract getAccessUrl(storedUrl: string): Promise<FileAccessUrl>;
}

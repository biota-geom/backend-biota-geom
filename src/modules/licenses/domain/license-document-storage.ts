import { Injectable } from '@nestjs/common';

export interface FileToStore {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export interface StoredDocument {
  /** Absolute, publicly reachable URL — local static route or an S3 object URL. */
  url: string;
}

/*
 * Storage port (Dependency Inversion): the use case depends on this
 * interface, never on Multer/fs/AWS directly. Swapping STORAGE_DRIVER from
 * `local` to `s3` (see license-document-storage.provider.ts) changes the
 * concrete implementation without touching application/domain code.
 */
@Injectable()
export abstract class LicenseDocumentStorage {
  abstract upload(
    file: FileToStore,
    customerId: string,
  ): Promise<StoredDocument>;
}

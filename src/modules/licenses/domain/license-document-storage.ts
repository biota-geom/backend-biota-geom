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

export interface DocumentAccessUrl {
  /** URL the client can open right now to view the document. */
  url: string;
  /** Seconds until `url` stops working, or null when it never expires. */
  expiresInSeconds: number | null;
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

  /*
   * Turns the URL persisted at upload time into one the client can actually
   * open. For a private bucket this is a short-lived pre-signed URL; the
   * persisted URL itself is never handed out as a download link.
   */
  abstract getAccessUrl(storedUrl: string): Promise<DocumentAccessUrl>;
}

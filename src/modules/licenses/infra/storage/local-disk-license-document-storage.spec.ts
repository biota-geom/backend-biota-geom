import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageConfigService } from './storage-config.service';
import { LocalDiskLicenseDocumentStorage } from './local-disk-license-document-storage';

describe('LocalDiskLicenseDocumentStorage', () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'biota-license-storage-'));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  function buildStorage(): LocalDiskLicenseDocumentStorage {
    const config: Partial<StorageConfigService> = {
      localStorageDir: baseDir,
      appBaseUrl: 'http://localhost:3000',
    };

    return new LocalDiskLicenseDocumentStorage(config as StorageConfigService);
  }

  it('writes the file under licenses/<customerId>/ and returns an absolute URL', async () => {
    const storage = buildStorage();

    const result = await storage.upload(
      {
        buffer: Buffer.from('%PDF-1.4 fake content'),
        originalName: 'licenca.PDF',
        mimeType: 'application/pdf',
      },
      'customer-1',
    );

    expect(result.url).toMatch(
      /^http:\/\/localhost:3000\/uploads\/licenses\/customer-1\/[0-9a-f-]+\.pdf$/,
    );

    const fileName = result.url.split('/').pop()!;
    const written = await readFile(
      join(baseDir, 'licenses', 'customer-1', fileName),
    );
    expect(written.toString()).toBe('%PDF-1.4 fake content');
  });

  it('generates a distinct file name per upload, even for the same original name', async () => {
    const storage = buildStorage();
    const file = {
      buffer: Buffer.from('content'),
      originalName: 'licenca.pdf',
      mimeType: 'application/pdf',
    };

    const first = await storage.upload(file, 'customer-1');
    const second = await storage.upload(file, 'customer-1');

    expect(first.url).not.toBe(second.url);
  });
});

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDiskFileStorage } from './local-disk-file-storage';
import { StorageConfigService } from './storage-config.service';

describe('LocalDiskFileStorage', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'biota-storage-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it.each(['licenses', 'documents'] as const)(
    'stores a file in the %s namespace and returns its public URL',
    async (category) => {
      const storage = new LocalDiskFileStorage({
        localStorageDir: directory,
        appBaseUrl: 'http://localhost:3000',
      } as StorageConfigService);

      const result = await storage.upload(
        {
          buffer: Buffer.from('content'),
          originalName: 'Report.PDF',
          mimeType: 'application/pdf',
        },
        { category, customerId: 'customer-1' },
      );

      expect(result.url).toMatch(
        new RegExp(
          `^http://localhost:3000/uploads/${category}/customer-1/[0-9a-f-]+\\.pdf$`,
        ),
      );
      const fileName = result.url.split('/').pop()!;
      await expect(
        readFile(join(directory, category, 'customer-1', fileName), 'utf8'),
      ).resolves.toBe('content');
    },
  );

  it('returns the stored URL without expiration', async () => {
    const storage = new LocalDiskFileStorage({
      localStorageDir: directory,
      appBaseUrl: 'http://localhost:3000',
    } as StorageConfigService);
    const storedUrl =
      'http://localhost:3000/uploads/documents/customer-1/file.pdf';

    await expect(storage.getAccessUrl(storedUrl)).resolves.toEqual({
      url: storedUrl,
      expiresInSeconds: null,
    });
  });
});

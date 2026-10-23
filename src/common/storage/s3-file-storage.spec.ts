import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extractObjectKey, S3FileStorage } from './s3-file-storage';
import { StorageConfigService } from './storage-config.service';

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: jest
      .fn()
      .mockImplementation((input: unknown) => ({ input })),
    GetObjectCommand: jest
      .fn()
      .mockImplementation((input: unknown) => ({ input })),
    __mockSend: send,
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue(
      'https://signed.example/documents/c/f.pdf?X-Amz-Signature=x',
    ),
}));

const send = (): jest.Mock =>
  jest.requireMock<{ __mockSend: jest.Mock }>('@aws-sdk/client-s3').__mockSend;
const client = jest.mocked(S3Client);
const put = PutObjectCommand as unknown as jest.Mock;
const get = GetObjectCommand as unknown as jest.Mock;
const sign = jest.mocked(getSignedUrl);

function config(overrides: Partial<StorageConfigService> = {}) {
  return {
    s3Bucket: 'bucket',
    s3Region: 'us-east-1',
    s3AccessKeyId: 'key',
    s3SecretAccessKey: 'secret',
    s3Endpoint: undefined,
    s3PublicUrlBase: undefined,
    s3SignedUrlTtlSeconds: 900,
    ...overrides,
  } as StorageConfigService;
}

const file = {
  buffer: Buffer.from('content'),
  originalName: 'Report.PDF',
  mimeType: 'application/pdf',
};

describe('S3FileStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    send().mockResolvedValue({});
  });

  it('uploads under the selected namespace and returns the AWS URL', async () => {
    const storage = new S3FileStorage(config());

    const result = await storage.upload(file, {
      category: 'documents',
      customerId: 'customer-1',
    });

    const [command] = put.mock.calls[0] as [
      { Bucket: string; Body: Buffer; ContentType: string; Key: string },
    ];
    expect(command.Bucket).toBe('bucket');
    expect(command.Body).toBe(file.buffer);
    expect(command.ContentType).toBe(file.mimeType);
    expect(command.Key).toMatch(/^documents\/customer-1\/[0-9a-f-]+\.pdf$/);
    expect(result.url).toMatch(
      /^https:\/\/bucket\.s3\.us-east-1\.amazonaws\.com\/documents\/customer-1\/[0-9a-f-]+\.pdf$/,
    );
  });

  it('uses a custom public URL and supports implicit credentials', async () => {
    const storage = new S3FileStorage(
      config({
        s3AccessKeyId: undefined,
        s3SecretAccessKey: undefined,
        s3PublicUrlBase: 'https://cdn.example.com',
      }),
    );

    const result = await storage.upload(file, {
      category: 'licenses',
      customerId: 'customer-1',
    });

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: undefined }),
    );
    expect(result.url).toMatch(
      /^https:\/\/cdn\.example\.com\/licenses\/customer-1\//,
    );
  });

  it.each(['https://cdn.example.com/files', 'https://cdn.example.com/files/'])(
    'preserves a path in a custom public URL base: %s',
    async (base) => {
      const storage = new S3FileStorage(config({ s3PublicUrlBase: base }));

      const result = await storage.upload(file, {
        category: 'documents',
        customerId: 'customer-1',
      });

      expect(result.url).toMatch(
        /^https:\/\/cdn\.example\.com\/files\/documents\/customer-1\//,
      );
    },
  );

  it('stores a file without adding an extension when none was supplied', async () => {
    const storage = new S3FileStorage(config());

    await storage.upload(
      { ...file, originalName: 'report-without-extension' },
      { category: 'documents', customerId: 'customer-1' },
    );

    const [command] = put.mock.calls[0] as [{ Key: string }];
    expect(command.Key).toMatch(/^documents\/customer-1\/[0-9a-f-]{36}$/);
  });

  it('enables path style for compatible endpoints and rejects a missing bucket', async () => {
    const storage = new S3FileStorage(
      config({ s3Endpoint: 'http://localhost:9000', s3Bucket: undefined }),
    );

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({ forcePathStyle: true }),
    );
    await expect(
      storage.upload(file, {
        category: 'documents',
        customerId: 'customer-1',
      }),
    ).rejects.toThrow('AWS_S3_BUCKET');
  });

  describe('getAccessUrl', () => {
    it('signs the extracted object key with the configured TTL', async () => {
      const storage = new S3FileStorage(config({ s3SignedUrlTtlSeconds: 600 }));

      await expect(
        storage.getAccessUrl(
          'https://cdn.example.com/files/documents/customer-1/report.pdf',
        ),
      ).resolves.toEqual({
        url: 'https://signed.example/documents/c/f.pdf?X-Amz-Signature=x',
        expiresInSeconds: 600,
      });
      expect(get).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'documents/customer-1/report.pdf',
        ResponseContentDisposition: 'inline',
      });
      expect(sign).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 600,
      });
    });

    it('does not invoke the signer when the bucket is missing', async () => {
      const storage = new S3FileStorage(config({ s3Bucket: undefined }));

      await expect(
        storage.getAccessUrl(
          'https://cdn.example.com/documents/customer-1/report.pdf',
        ),
      ).rejects.toThrow('AWS_S3_BUCKET');
      expect(sign).not.toHaveBeenCalled();
    });
  });
});

describe('extractObjectKey', () => {
  it.each([
    [
      'virtual-hosted license URL',
      'https://bucket.s3.us-east-1.amazonaws.com/licenses/c-1/doc.pdf',
      'licenses/c-1/doc.pdf',
    ],
    [
      'virtual-hosted document URL',
      'https://bucket.s3.us-east-1.amazonaws.com/documents/c-1/doc.pdf',
      'documents/c-1/doc.pdf',
    ],
    [
      'path-style URL',
      'http://localhost:9000/bucket/documents/c-1/doc.pdf',
      'documents/c-1/doc.pdf',
    ],
    [
      'CDN base with a path',
      'https://cdn.example.com/files/documents/c-1/doc.pdf',
      'documents/c-1/doc.pdf',
    ],
    [
      'bucket named like a category',
      'http://localhost:9000/documents/documents/c-1/doc.pdf',
      'documents/c-1/doc.pdf',
    ],
    [
      'percent-encoded key',
      'https://cdn.example.com/documents/c-1/my%20doc.pdf',
      'documents/c-1/my doc.pdf',
    ],
    [
      'fallback path with repeated leading slashes',
      'https://cdn.example.com//other/doc.pdf',
      'other/doc.pdf',
    ],
  ])('extracts the key from a %s', (_label, url, expected) => {
    expect(extractObjectKey(url)).toBe(expected);
  });
});

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageConfigService } from './storage-config.service';
import {
  extractObjectKey,
  S3LicenseDocumentStorage,
} from './s3-license-document-storage';

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
      'https://signed.example/licenses/c/f.pdf?X-Amz-Signature=x',
    ),
}));

function mockSend(): jest.Mock {
  return jest.requireMock<{ __mockSend: jest.Mock }>('@aws-sdk/client-s3')
    .__mockSend;
}

const MockedS3Client = jest.mocked(S3Client);
// Kept loosely typed on purpose: PutObjectCommand's real input type would
// force every assertion here to match PutObjectCommandInput exactly, but the
// matchers below (expect.stringMatching, ...) are typed `any` in @types/jest.
const MockedPutObjectCommand = PutObjectCommand as unknown as jest.Mock;
const MockedGetObjectCommand = GetObjectCommand as unknown as jest.Mock;
const mockedGetSignedUrl = jest.mocked(getSignedUrl);

function buildConfig(overrides: Partial<StorageConfigService> = {}) {
  return {
    s3Bucket: 'biota-geom-licenses',
    s3Region: 'us-east-1',
    s3AccessKeyId: 'AKIAEXAMPLE',
    s3SecretAccessKey: 'secret',
    s3Endpoint: undefined,
    s3PublicUrlBase: undefined,
    s3SignedUrlTtlSeconds: 900,
    ...overrides,
  } as StorageConfigService;
}

const file = {
  buffer: Buffer.from('%PDF-1.4 fake content'),
  originalName: 'licenca.pdf',
  mimeType: 'application/pdf',
};

describe('S3LicenseDocumentStorage', () => {
  beforeEach(() => {
    mockSend().mockClear();
    MockedS3Client.mockClear();
    MockedPutObjectCommand.mockClear();
  });

  it('uploads the buffer to the configured bucket under licenses/<customerId>/', async () => {
    const storage = new S3LicenseDocumentStorage(buildConfig());

    const result = await storage.upload(file, 'customer-1');

    expect(MockedPutObjectCommand).toHaveBeenCalledTimes(1);
    const [putObjectInput] = MockedPutObjectCommand.mock.calls[0] as [
      { Bucket: string; Body: Buffer; ContentType: string; Key: string },
    ];
    expect(putObjectInput.Bucket).toBe('biota-geom-licenses');
    expect(putObjectInput.Body).toBe(file.buffer);
    expect(putObjectInput.ContentType).toBe('application/pdf');
    expect(putObjectInput.Key).toMatch(
      /^licenses\/customer-1\/[0-9a-f-]+\.pdf$/,
    );
    expect(mockSend()).toHaveBeenCalledTimes(1);
    expect(result.url).toMatch(
      /^https:\/\/biota-geom-licenses\.s3\.us-east-1\.amazonaws\.com\/licenses\/customer-1\/[0-9a-f-]+\.pdf$/,
    );
  });

  it('builds the URL from AWS_S3_PUBLIC_URL_BASE when configured (e.g. a CDN domain)', async () => {
    const storage = new S3LicenseDocumentStorage(
      buildConfig({ s3PublicUrlBase: 'https://cdn.biotageom.com.br' }),
    );

    const result = await storage.upload(file, 'customer-1');

    expect(result.url).toMatch(
      /^https:\/\/cdn\.biotageom\.com\.br\/licenses\/customer-1\/[0-9a-f-]+\.pdf$/,
    );
  });

  it.each([
    ['without a trailing slash', 'https://cdn.example.com/files'],
    ['with a trailing slash', 'https://cdn.example.com/files/'],
  ])(
    'keeps the path of AWS_S3_PUBLIC_URL_BASE %s',
    async (_label, s3PublicUrlBase) => {
      const storage = new S3LicenseDocumentStorage(
        buildConfig({ s3PublicUrlBase }),
      );

      const result = await storage.upload(file, 'customer-1');

      expect(result.url).toMatch(
        /^https:\/\/cdn\.example\.com\/files\/licenses\/customer-1\/[0-9a-f-]+\.pdf$/,
      );
    },
  );

  it('stores a file whose original name has no extension without one', async () => {
    const storage = new S3LicenseDocumentStorage(buildConfig());

    await storage.upload(
      { ...file, originalName: 'licenca-sem-extensao' },
      'customer-1',
    );

    const [putObjectInput] = MockedPutObjectCommand.mock.calls[0] as [
      { Key: string },
    ];
    expect(putObjectInput.Key).toMatch(/^licenses\/customer-1\/[0-9a-f-]{36}$/);
  });

  it('throws when AWS_S3_BUCKET is not set', async () => {
    const storage = new S3LicenseDocumentStorage(
      buildConfig({ s3Bucket: undefined }),
    );

    await expect(storage.upload(file, 'customer-1')).rejects.toThrow(
      /AWS_S3_BUCKET/,
    );
  });

  it('enables path-style addressing when an S3-compatible endpoint is set', () => {
    new S3LicenseDocumentStorage(
      buildConfig({ s3Endpoint: 'http://localhost:9000' }),
    );

    expect(MockedS3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'http://localhost:9000',
        forcePathStyle: true,
      }),
    );
  });

  describe('getAccessUrl', () => {
    beforeEach(() => {
      MockedGetObjectCommand.mockClear();
      mockedGetSignedUrl.mockClear();
    });

    it('signs a GetObject for the stored key with the configured TTL', async () => {
      const storage = new S3LicenseDocumentStorage(
        buildConfig({ s3SignedUrlTtlSeconds: 600 }),
      );

      const result = await storage.getAccessUrl(
        'https://biota-geom-licenses.s3.us-east-1.amazonaws.com/licenses/customer-1/doc.pdf',
      );

      expect(MockedGetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'biota-geom-licenses',
        Key: 'licenses/customer-1/doc.pdf',
        ResponseContentDisposition: 'inline',
      });
      expect(mockedGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 600 },
      );
      expect(result).toEqual({
        url: 'https://signed.example/licenses/c/f.pdf?X-Amz-Signature=x',
        expiresInSeconds: 600,
      });
    });

    it('throws when AWS_S3_BUCKET is not set', async () => {
      const storage = new S3LicenseDocumentStorage(
        buildConfig({ s3Bucket: undefined }),
      );

      await expect(
        storage.getAccessUrl('https://x/licenses/customer-1/doc.pdf'),
      ).rejects.toThrow(/AWS_S3_BUCKET/);
      expect(mockedGetSignedUrl).not.toHaveBeenCalled();
    });
  });
});

describe('extractObjectKey', () => {
  it.each([
    [
      'virtual-hosted S3 URL',
      'https://bucket.s3.us-east-1.amazonaws.com/licenses/c-1/doc.pdf',
    ],
    [
      'path-style URL (MinIO)',
      'http://localhost:9000/bucket/licenses/c-1/doc.pdf',
    ],
    [
      'CDN base with a path',
      'https://cdn.example.com/files/licenses/c-1/doc.pdf',
    ],
    [
      'bucket named like the prefix',
      'http://localhost:9000/licenses/licenses/c-1/doc.pdf',
    ],
  ])('recovers the key from a %s', (_label, url) => {
    expect(extractObjectKey(url)).toBe('licenses/c-1/doc.pdf');
  });

  it('decodes percent-encoded characters in the key', () => {
    expect(
      extractObjectKey('https://cdn.example.com/licenses/c-1/my%20doc.pdf'),
    ).toBe('licenses/c-1/my doc.pdf');
  });

  it('strips every leading slash when the prefix is missing', () => {
    expect(extractObjectKey('https://cdn.example.com//other/doc.pdf')).toBe(
      'other/doc.pdf',
    );
  });

  it('falls back to the whole path when the prefix is missing', () => {
    expect(extractObjectKey('https://cdn.example.com/other/doc.pdf')).toBe(
      'other/doc.pdf',
    );
  });
});

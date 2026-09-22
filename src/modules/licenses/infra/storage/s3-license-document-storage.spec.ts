import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StorageConfigService } from './storage-config.service';
import { S3LicenseDocumentStorage } from './s3-license-document-storage';

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: jest
      .fn()
      .mockImplementation((input: unknown) => ({ input })),
    __mockSend: send,
  };
});

function mockSend(): jest.Mock {
  return jest.requireMock<{ __mockSend: jest.Mock }>('@aws-sdk/client-s3')
    .__mockSend;
}

const MockedS3Client = jest.mocked(S3Client);
// Kept loosely typed on purpose: PutObjectCommand's real input type would
// force every assertion here to match PutObjectCommandInput exactly, but the
// matchers below (expect.stringMatching, ...) are typed `any` in @types/jest.
const MockedPutObjectCommand = PutObjectCommand as unknown as jest.Mock;

function buildConfig(overrides: Partial<StorageConfigService> = {}) {
  return {
    s3Bucket: 'biota-geom-licenses',
    s3Region: 'us-east-1',
    s3AccessKeyId: 'AKIAEXAMPLE',
    s3SecretAccessKey: 'secret',
    s3Endpoint: undefined,
    s3PublicUrlBase: undefined,
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
});

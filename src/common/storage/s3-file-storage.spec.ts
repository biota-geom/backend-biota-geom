import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { S3FileStorage } from './s3-file-storage';
import { StorageConfigService } from './storage-config.service';

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

const send = (): jest.Mock =>
  jest.requireMock<{ __mockSend: jest.Mock }>('@aws-sdk/client-s3').__mockSend;
const client = jest.mocked(S3Client);
const put = PutObjectCommand as unknown as jest.Mock;

function config(overrides: Partial<StorageConfigService> = {}) {
  return {
    s3Bucket: 'bucket',
    s3Region: 'us-east-1',
    s3AccessKeyId: 'key',
    s3SecretAccessKey: 'secret',
    s3Endpoint: undefined,
    s3PublicUrlBase: undefined,
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
});

import { StorageConfigService } from './storage-config.service';
import { S3FileStorage } from './s3-file-storage';

/*
 * Runs the real AWS SDK signer (no network involved — signing is local) to
 * prove the URL handed to the client is a SigV4 pre-signed URL that expires,
 * rather than the bare object URL a private bucket answers with 403.
 */
describe('S3FileStorage pre-signed URL (real signer)', () => {
  const config = {
    s3Bucket: 'biota-geom-licenses',
    s3Region: 'us-east-1',
    s3AccessKeyId: 'AKIAEXAMPLE',
    s3SecretAccessKey: 'secret',
    s3Endpoint: undefined,
    s3PublicUrlBase: undefined,
    s3SignedUrlTtlSeconds: 900,
  } as StorageConfigService;

  it('returns a SigV4 URL for the stored object that expires after the TTL', async () => {
    const storage = new S3FileStorage(config);

    const result = await storage.getAccessUrl(
      'https://biota-geom-licenses.s3.us-east-1.amazonaws.com/licenses/customer-1/doc.pdf',
    );

    const url = new URL(result.url);
    expect(url.host).toBe('biota-geom-licenses.s3.us-east-1.amazonaws.com');
    expect(url.pathname).toBe('/licenses/customer-1/doc.pdf');
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(url.searchParams.get('response-content-disposition')).toBe('inline');
    expect(result.expiresInSeconds).toBe(900);
  });

  it('signs a customer document key through a CDN URL with a path', async () => {
    const storage = new S3FileStorage(config);

    const result = await storage.getAccessUrl(
      'https://cdn.example.com/private/documents/customer-1/report.pdf',
    );

    const url = new URL(result.url);
    expect(url.pathname).toBe('/documents/customer-1/report.pdf');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });
});

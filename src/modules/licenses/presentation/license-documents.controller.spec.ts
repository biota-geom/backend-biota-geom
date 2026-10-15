import { GetLicenseDocumentUrlUseCase } from '../application/get-license-document-url.use-case';
import { LicenseDocumentsController } from './license-documents.controller';

describe('LicenseDocumentsController', () => {
  it('returns the signed URL for the authenticated user', async () => {
    const execute = jest.fn().mockResolvedValue({
      url: 'https://signed.example/doc.pdf?X-Amz-Signature=x',
      expiresInSeconds: 900,
    });
    const controller = new LicenseDocumentsController({
      execute,
    } as unknown as GetLicenseDocumentUrlUseCase);

    await expect(
      controller.getDocumentUrl('license-1', { id: 'owner-1' }),
    ).resolves.toEqual({
      document_url: 'https://signed.example/doc.pdf?X-Amz-Signature=x',
      expires_in: 900,
    });
    expect(execute).toHaveBeenCalledWith('license-1', 'owner-1');
  });
});

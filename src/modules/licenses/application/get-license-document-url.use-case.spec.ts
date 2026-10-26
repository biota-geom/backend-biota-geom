import { FileStorage } from '../../../common/storage/file-storage';
import { LicenseRepository } from '../domain/licenses.repository';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { GetLicenseDocumentUrlUseCase } from './get-license-document-url.use-case';

describe('GetLicenseDocumentUrlUseCase', () => {
  const storedUrl =
    'https://bucket.s3.us-east-1.amazonaws.com/licenses/customer-1/doc.pdf';
  const accessUrl = {
    url: `${storedUrl}?X-Amz-Signature=x`,
    expiresInSeconds: 900,
  };

  function build(license: unknown) {
    const findByIdForOwner = jest.fn().mockResolvedValue(license);
    const getAccessUrl = jest.fn().mockResolvedValue(accessUrl);
    const useCase = new GetLicenseDocumentUrlUseCase(
      { findByIdForOwner } as unknown as LicenseRepository,
      { getAccessUrl } as unknown as FileStorage,
    );

    return { useCase, findByIdForOwner, getAccessUrl };
  }

  it('signs the stored document URL of a license owned by the user', async () => {
    const { useCase, findByIdForOwner, getAccessUrl } = build({
      id: 'license-1',
      documentUrl: storedUrl,
    });

    await expect(useCase.execute('license-1', 'owner-1')).resolves.toBe(
      accessUrl,
    );
    expect(findByIdForOwner).toHaveBeenCalledWith('license-1', 'owner-1');
    expect(getAccessUrl).toHaveBeenCalledWith(storedUrl);
  });

  it('rejects a license that does not exist or belongs to another owner', async () => {
    const { useCase, getAccessUrl } = build(null);

    await expect(useCase.execute('license-1', 'owner-1')).rejects.toThrow(
      LicenseNotFoundError,
    );
    expect(getAccessUrl).not.toHaveBeenCalled();
  });
});

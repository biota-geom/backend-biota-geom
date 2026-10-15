import { GetLicenseDocumentUrlUseCase } from '../application/get-license-document-url.use-case';
import { BadRequestException } from '@nestjs/common';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import {
  licenseIdPipe,
  LicenseDocumentsController,
} from './license-documents.controller';

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

  it('rejects a malformed license id with the generic PT-BR 400', async () => {
    const error = await licenseIdPipe
      .transform('not-a-uuid', { type: 'param', data: 'licenseId' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).message).toBe(
      AUTH_MESSAGES.INVALID_REQUEST,
    );
  });
});

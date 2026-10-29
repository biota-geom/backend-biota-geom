import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { LicenseExtractionTimeoutError } from '../../domain/errors/license-extraction-timeout.error';
import { LicenseExtractionUnavailableError } from '../../domain/errors/license-extraction-unavailable.error';
import { UnreadableLicenseDocumentError } from '../../domain/errors/unreadable-license-document.error';
import { LICENSES_MESSAGES } from '../messages/licenses.messages.pt-br';
import { LicenseExtractionExceptionFilter } from './license-extraction-exception.filter';

function buildHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('LicenseExtractionExceptionFilter', () => {
  const filter = new LicenseExtractionExceptionFilter();

  it.each([
    [
      new UnreadableLicenseDocumentError('not a license'),
      HttpStatus.UNPROCESSABLE_ENTITY,
      LICENSES_MESSAGES.EXTRACTION_UNREADABLE,
    ],
    [
      new LicenseExtractionTimeoutError(60_000),
      HttpStatus.GATEWAY_TIMEOUT,
      LICENSES_MESSAGES.EXTRACTION_TIMEOUT,
    ],
    [
      new LicenseExtractionUnavailableError('AccessDeniedException'),
      HttpStatus.SERVICE_UNAVAILABLE,
      LICENSES_MESSAGES.EXTRACTION_UNAVAILABLE,
    ],
  ])('maps %p to %i with a generic PT-BR message', (error, code, message) => {
    const { host, status, json } = buildHost();

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(code);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message }));
    // The internal reason never reaches the client.
    expect(JSON.stringify(json.mock.calls[0])).not.toContain(
      'AccessDeniedException',
    );
  });
});

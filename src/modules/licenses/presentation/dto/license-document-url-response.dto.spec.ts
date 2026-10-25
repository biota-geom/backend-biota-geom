import { toLicenseDocumentUrlResponse } from './license-document-url-response.dto';

describe('toLicenseDocumentUrlResponse', () => {
  it('maps the access URL to the snake_case contract', () => {
    expect(
      toLicenseDocumentUrlResponse({
        url: 'https://signed.example/doc.pdf',
        expiresInSeconds: 900,
      }),
    ).toEqual({
      document_url: 'https://signed.example/doc.pdf',
      expires_in: 900,
    });
  });
});

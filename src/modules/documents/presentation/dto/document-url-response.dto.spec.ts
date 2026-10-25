import { toDocumentUrlResponse } from './document-url-response.dto';

describe('toDocumentUrlResponse', () => {
  it('maps the access URL to the snake_case contract', () => {
    expect(
      toDocumentUrlResponse({
        url: 'https://signed.example/document.pdf',
        expiresInSeconds: 900,
      }),
    ).toEqual({
      document_url: 'https://signed.example/document.pdf',
      expires_in: 900,
    });
  });
});

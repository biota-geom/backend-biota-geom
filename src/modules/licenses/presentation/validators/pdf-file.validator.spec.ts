import { PdfFileValidator } from './pdf-file.validator';

describe('PdfFileValidator', () => {
  const validator = new PdfFileValidator(
    'O arquivo deve estar no formato PDF.',
  );

  it('accepts a file with mimetype application/pdf', () => {
    expect(
      validator.isValid({ mimetype: 'application/pdf' } as Express.Multer.File),
    ).toBe(true);
  });

  it('rejects a file with a different mimetype', () => {
    expect(
      validator.isValid({ mimetype: 'image/jpeg' } as Express.Multer.File),
    ).toBe(false);
  });

  it('rejects when no file is present', () => {
    expect(validator.isValid(undefined)).toBe(false);
  });

  it('builds the injected error message', () => {
    expect(validator.buildErrorMessage()).toBe(
      'O arquivo deve estar no formato PDF.',
    );
  });
});

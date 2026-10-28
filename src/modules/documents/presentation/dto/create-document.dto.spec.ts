import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDocumentDto } from './create-document.dto';

describe('CreateDocumentDto', () => {
  it('accepts and trims valid metadata', async () => {
    const dto = plainToInstance(CreateDocumentDto, {
      title: '  Annual report  ',
      document_date: '2026-08-15',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.title).toBe('Annual report');
  });

  it('accepts metadata without a document date', async () => {
    const dto = plainToInstance(CreateDocumentDto, {
      title: 'Annual report',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.document_date).toBeUndefined();
  });

  it.each([
    [{ title: '', document_date: '2026-08-15' }],
    [{ title: 'Report', document_date: '2026-02-31' }],
    [{ title: 'Report', document_date: '2026-08-15T00:00:00Z' }],
    [{ title: 123, document_date: '2026-08-15' }],
  ])('rejects invalid metadata %#', async (payload) => {
    const errors = await validate(plainToInstance(CreateDocumentDto, payload));
    expect(errors.length).toBeGreaterThan(0);
  });
});

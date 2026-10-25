import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDocumentFolderDto } from './create-document-folder.dto';

describe('CreateDocumentFolderDto', () => {
  it('trims and accepts a valid folder name and parent', async () => {
    const dto = plainToInstance(CreateDocumentFolderDto, {
      name: '  Licencas ambientais  ',
      parent_id: '11111111-1111-4111-8111-111111111111',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Licencas ambientais');
  });

  it('accepts a root folder without a parent', async () => {
    const dto = plainToInstance(CreateDocumentFolderDto, { name: 'Raiz' });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects blank, oversized and non-string names', async () => {
    const payloads = [{ name: '   ' }, { name: 'a'.repeat(101) }, { name: 42 }];

    for (const payload of payloads) {
      const errors = await validate(
        plainToInstance(CreateDocumentFolderDto, payload),
      );
      expect(errors.map((error) => error.property)).toContain('name');
    }
  });

  it('rejects an invalid parent id', async () => {
    const dto = plainToInstance(CreateDocumentFolderDto, {
      name: 'Licencas',
      parent_id: 'not-a-uuid',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain('parent_id');
  });
});

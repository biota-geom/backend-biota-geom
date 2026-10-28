import { CustomerDocument } from '../../domain/document.entity';
import { toDocumentResponse } from './document-response.dto';

describe('toDocumentResponse', () => {
  it('maps dates and uploader without exposing the storage URL', () => {
    const document = {
      id: 'document-1',
      customerId: 'customer-1',
      title: 'Report',
      documentDate: new Date('2026-08-15T00:00:00.000Z'),
      folderId: null,
      fileUrl: 'https://private.example/document.pdf',
      fileName: 'document.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 123,
      uploadedById: 'user-1',
      uploadedBy: { id: 'user-1', name: 'Consultancy' },
      createdAt: new Date('2026-10-04T14:00:00.000Z'),
      deletedAt: null,
      deletedById: null,
    } satisfies CustomerDocument;

    expect(toDocumentResponse(document)).toEqual({
      id: 'document-1',
      title: 'Report',
      document_date: '2026-08-15',
      file_name: 'document.pdf',
      size_bytes: 123,
      uploaded_by: { id: 'user-1', name: 'Consultancy' },
      created_at: '2026-10-04T14:00:00.000Z',
      folder_id: null,
    });
  });
});

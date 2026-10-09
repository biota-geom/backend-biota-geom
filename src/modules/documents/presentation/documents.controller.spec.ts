import { CustomerDocumentType } from '../domain/customer-document-type';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerDocument } from '../domain/document.entity';
import {
  documentFileValidationExceptionFactory,
  DocumentsController,
  invalidDocumentCustomerIdException,
} from './documents.controller';

const document: CustomerDocument = {
  id: 'document-1',
  customerId: 'customer-1',
  title: 'Report',
  type: CustomerDocumentType.LAUDO,
  documentDate: new Date('2026-08-15T00:00:00.000Z'),
  fileUrl: 'https://files/report.pdf',
  fileName: 'report.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 8,
  uploadedById: 'user-1',
  uploadedBy: { id: 'user-1', name: 'Consultancy' },
  createdAt: new Date('2026-10-04T14:00:00.000Z'),
  deletedAt: null,
};

describe('DocumentsController', () => {
  const create = jest.fn().mockResolvedValue(document);
  const list = jest.fn().mockResolvedValue([document]);
  const controller = new DocumentsController(
    { execute: create } as never,
    { execute: list } as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('passes normalized multipart data and authenticated user to creation', async () => {
    const response = await controller.create(
      'customer-1',
      {
        title: 'Report',
        type: CustomerDocumentType.LAUDO,
        document_date: '2026-08-15',
      },
      {
        buffer: Buffer.from('%PDF-'),
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
        size: 5,
      },
      { id: 'user-1' },
    );

    const [input] = create.mock.calls[0] as [
      {
        customerId: string;
        ownerUserId: string;
        documentDate: Date;
        file: { originalName: string; mimeType: string; size: number };
      },
    ];
    expect(input).toMatchObject({
      customerId: 'customer-1',
      ownerUserId: 'user-1',
      documentDate: new Date('2026-08-15T00:00:00.000Z'),
      file: {
        originalName: 'report.pdf',
        mimeType: 'application/pdf',
        size: 5,
      },
    });
    expect(response.id).toBe('document-1');
  });

  it('maps the active document list', async () => {
    const response = await controller.list('customer-1', { id: 'user-1' });

    expect(list).toHaveBeenCalledWith('customer-1', 'user-1');
    expect(response).toEqual([
      expect.objectContaining({
        id: 'document-1',
        document_date: '2026-08-15',
      }),
    ]);
  });
});

describe('documentFileValidationExceptionFactory', () => {
  it.each([
    AUTH_MESSAGES.DOCUMENT_FILE_TOO_LARGE,
    AUTH_MESSAGES.DOCUMENT_INVALID_FILE_TYPE,
  ])('preserves known file error messages', (message) => {
    expect(
      documentFileValidationExceptionFactory(message).getResponse(),
    ).toEqual(expect.objectContaining({ message }));
  });

  it('hides framework messages behind the required-file message', () => {
    expect(
      documentFileValidationExceptionFactory('File is required').getResponse(),
    ).toEqual(
      expect.objectContaining({
        message: AUTH_MESSAGES.DOCUMENT_FILE_REQUIRED,
      }),
    );
  });
});

describe('invalidDocumentCustomerIdException', () => {
  it('uses the generic safe request message', () => {
    expect(invalidDocumentCustomerIdException().getResponse()).toEqual(
      expect.objectContaining({ message: AUTH_MESSAGES.INVALID_REQUEST }),
    );
  });
});

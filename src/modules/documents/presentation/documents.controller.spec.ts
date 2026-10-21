import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerDocument } from '../domain/document.entity';
import {
  documentFileValidationExceptionFactory,
  DocumentsController,
  invalidDocumentRouteIdException,
} from './documents.controller';

const document: CustomerDocument = {
  id: 'document-1',
  customerId: 'customer-1',
  title: 'Report',
  documentDate: new Date('2026-08-15T00:00:00.000Z'),
  folderId: null,
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
  const getUrl = jest.fn().mockResolvedValue({
    url: 'https://signed.example/document.pdf',
    expiresInSeconds: 900,
  });
  const folder = {
    id: 'folder-1',
    customerId: 'customer-1',
    parentId: null,
    name: 'Ambiental',
    createdAt: new Date('2026-10-21T18:00:00.000Z'),
  };
  const createFolder = jest.fn().mockResolvedValue(folder);
  const listFolders = jest.fn().mockResolvedValue([folder]);
  const controller = new DocumentsController(
    { execute: create } as never,
    { execute: list } as never,
    { execute: getUrl } as never,
    { execute: createFolder } as never,
    { execute: listFolders } as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('passes normalized multipart data and authenticated user to creation', async () => {
    const response = await controller.create(
      'customer-1',
      {
        title: 'Report',
        document_date: '2026-08-15',
        folder_id: undefined,
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
      folderId: null,
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

  it('returns an access URL after passing both route ids and the owner', async () => {
    const response = await controller.getUrl('customer-1', 'document-1', {
      id: 'user-1',
    });

    expect(getUrl).toHaveBeenCalledWith('document-1', 'customer-1', 'user-1');
    expect(response).toEqual({
      document_url: 'https://signed.example/document.pdf',
      expires_in: 900,
    });
  });

  it('creates and lists user-defined folders', async () => {
    const created = await controller.createFolder(
      'customer-1',
      { name: 'Ambiental', parent_id: undefined },
      { id: 'user-1' },
    );
    const listed = await controller.listFolders('customer-1', {
      id: 'user-1',
    });

    expect(createFolder).toHaveBeenCalledWith({
      customerId: 'customer-1',
      ownerUserId: 'user-1',
      parentId: null,
      name: 'Ambiental',
    });
    expect(listFolders).toHaveBeenCalledWith('customer-1', 'user-1');
    expect(created).toEqual({
      id: 'folder-1',
      name: 'Ambiental',
      parent_id: null,
      created_at: '2026-10-21T18:00:00.000Z',
    });
    expect(listed).toEqual([created]);
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

describe('invalidDocumentRouteIdException', () => {
  it('uses the generic safe request message', () => {
    expect(invalidDocumentRouteIdException().getResponse()).toEqual(
      expect.objectContaining({ message: AUTH_MESSAGES.INVALID_REQUEST }),
    );
  });
});

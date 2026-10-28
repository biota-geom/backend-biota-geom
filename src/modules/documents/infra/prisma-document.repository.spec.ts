import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaDocumentRepository } from './prisma-document.repository';

describe('PrismaDocumentRepository', () => {
  const create = jest.fn();
  const findFirst = jest.fn();
  const findMany = jest.fn();
  const update = jest.fn();
  const repository = new PrismaDocumentRepository({
    document: { create, findFirst, findMany, update },
  } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('creates a document connected to its customer and uploader', async () => {
    create.mockResolvedValue({ id: 'document-1' });

    await repository.create({
      customerId: 'customer-1',
      uploadedById: 'user-1',
      title: 'Report',
      documentDate: new Date('2026-08-15T00:00:00.000Z'),
      fileUrl: 'https://files/report.pdf',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      folderId: null,
    });

    const [query] = create.mock.calls[0] as [
      {
        data: { customer: unknown; uploadedBy: unknown };
        include: unknown;
      },
    ];
    expect(query.data.customer).toEqual({ connect: { id: 'customer-1' } });
    expect(query.data.uploadedBy).toEqual({ connect: { id: 'user-1' } });
    expect(query.include).toEqual({
      uploadedBy: { select: { id: true, name: true } },
    });
  });

  it('connects the document to the selected folder', async () => {
    create.mockResolvedValue({ id: 'document-1' });

    await repository.create({
      customerId: 'customer-1',
      uploadedById: 'user-1',
      title: 'Report',
      documentDate: new Date('2026-08-15T00:00:00.000Z'),
      fileUrl: 'https://files/report.pdf',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      folderId: 'folder-1',
    });

    const [query] = create.mock.calls[0] as [{ data: { folder: unknown } }];
    expect(query.data.folder).toEqual({ connect: { id: 'folder-1' } });
  });

  it('finds only an active document belonging to the requested customer and owner', async () => {
    findFirst.mockResolvedValue({ id: 'document-1' });

    await repository.findByIdForOwner('document-1', 'customer-1', 'owner-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'document-1',
        customerId: 'customer-1',
        deletedAt: null,
        customer: { ownerUserId: 'owner-1' },
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
  });

  it('lists only non-deleted documents in newest-document-first order', async () => {
    findMany.mockResolvedValue([]);

    await repository.findActiveByCustomerId('customer-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1', deletedAt: null },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('stamps the removal instead of deleting the row', async () => {
    update.mockResolvedValue({ id: 'document-1' });
    const before = Date.now();

    await repository.softDelete('document-1', 'user-1');

    const [query] = update.mock.calls[0] as [
      { where: { id: string }; data: { deletedAt: Date; deletedById: string } },
    ];
    expect(query.where).toEqual({ id: 'document-1' });
    expect(query.data.deletedById).toBe('user-1');
    expect(query.data.deletedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});

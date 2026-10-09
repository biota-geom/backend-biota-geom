import { CustomerDocumentType } from '../domain/customer-document-type';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaDocumentRepository } from './prisma-document.repository';

describe('PrismaDocumentRepository', () => {
  const create = jest.fn();
  const findMany = jest.fn();
  const repository = new PrismaDocumentRepository({
    document: { create, findMany },
  } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('creates a document connected to its customer and uploader', async () => {
    create.mockResolvedValue({ id: 'document-1' });

    await repository.create({
      customerId: 'customer-1',
      uploadedById: 'user-1',
      title: 'Report',
      type: CustomerDocumentType.LAUDO,
      documentDate: new Date('2026-08-15T00:00:00.000Z'),
      fileUrl: 'https://files/report.pdf',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
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

  it('lists only non-deleted documents in newest-document-first order', async () => {
    findMany.mockResolvedValue([]);

    await repository.findActiveByCustomerId('customer-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1', deletedAt: null },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }],
    });
  });
});

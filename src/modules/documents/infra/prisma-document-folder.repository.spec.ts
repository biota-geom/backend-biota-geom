import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaDocumentFolderRepository } from './prisma-document-folder.repository';

describe('PrismaDocumentFolderRepository', () => {
  const create = jest.fn();
  const findFirst = jest.fn();
  const findMany = jest.fn();
  const repository = new PrismaDocumentFolderRepository({
    documentFolder: { create, findFirst, findMany },
  } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('creates a folder with an optional parent', async () => {
    const data = {
      customerId: 'customer-1',
      parentId: 'parent-1',
      name: 'Licenças',
    };
    create.mockResolvedValue({ id: 'folder-1', ...data });

    await repository.create(data);

    expect(create).toHaveBeenCalledWith({ data });
  });

  it('lists every folder of the customer in stable order', async () => {
    findMany.mockResolvedValue([]);

    await repository.findAllByCustomerId('customer-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('isolates a folder by customer and owner', async () => {
    findFirst.mockResolvedValue(null);

    await repository.findByIdForOwner('folder-1', 'customer-1', 'owner-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'folder-1',
        customerId: 'customer-1',
        customer: { ownerUserId: 'owner-1' },
      },
    });
  });

  it('checks duplicate names case-insensitively within the same parent', async () => {
    findFirst.mockResolvedValue(null);

    await repository.findByName('customer-1', null, 'Ambiental');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        customerId: 'customer-1',
        parentId: null,
        name: { equals: 'Ambiental', mode: 'insensitive' },
      },
    });
  });
});

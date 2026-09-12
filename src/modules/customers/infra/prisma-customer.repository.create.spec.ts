import { AddressType, DocumentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerData } from '../domain/create-customer.data';
import { CustomerAlreadyExistsError } from '../domain/errors/customer-already-exists.error';
import { PrismaCustomerRepository } from './prisma-customer.repository';

const DATA: CreateCustomerData = {
  name: 'Unidade Industrial RS',
  document: '12345678000199',
  documentType: DocumentType.CNPJ,
  sectorId: 'sector-1',
  email: 'contato@unidade.com.br',
  ownerName: 'Ana Silva',
  ownerEmail: 'ana.silva@unidade.com.br',
  ownerPhone: '+55 51 99999-0000',
  address: {
    type: AddressType.BILLING,
    street: 'Av. Assis Brasil',
    number: '123',
    city: 'Porto Alegre',
    state: 'RS',
    postalCode: '91010-000',
    countryCode: 'BR',
  },
};

function buildRepository(create: jest.Mock): PrismaCustomerRepository {
  const prisma = { customer: { create } } as unknown as PrismaService;

  return new PrismaCustomerRepository(prisma);
}

describe('PrismaCustomerRepository.create', () => {
  it('creates the customer and its address in a single nested write', async () => {
    const created = { id: 'customer-1' };
    const create = jest.fn().mockResolvedValue(created);

    await expect(buildRepository(create).create(DATA)).resolves.toBe(created);
    expect(create).toHaveBeenCalledWith({
      data: {
        name: DATA.name,
        document: DATA.document,
        documentType: DocumentType.CNPJ,
        email: DATA.email,
        ownerName: DATA.ownerName,
        ownerEmail: DATA.ownerEmail,
        ownerPhone: DATA.ownerPhone,
        sector: { connect: { id: 'sector-1' } },
        address: {
          create: {
            type: AddressType.BILLING,
            street: 'Av. Assis Brasil',
            number: '123',
            city: 'Porto Alegre',
            state: 'RS',
            postalCode: '91010-000',
            countryCode: 'BR',
          },
        },
      },
      include: { address: true, sector: true },
    });
  });

  it('translates a unique violation into a domain error', async () => {
    const create = jest.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(buildRepository(create).create(DATA)).rejects.toBeInstanceOf(
      CustomerAlreadyExistsError,
    );
  });

  it('rethrows any other prisma failure untouched', async () => {
    const failure = new Prisma.PrismaClientKnownRequestError('FK failed', {
      code: 'P2025',
      clientVersion: 'test',
    });
    const create = jest.fn().mockRejectedValue(failure);

    await expect(buildRepository(create).create(DATA)).rejects.toBe(failure);
  });

  it('rethrows a non-prisma failure untouched', async () => {
    const failure = new Error('connection lost');
    const create = jest.fn().mockRejectedValue(failure);

    await expect(buildRepository(create).create(DATA)).rejects.toBe(failure);
  });
});

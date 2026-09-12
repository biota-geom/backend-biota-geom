import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerData } from '../domain/create-customer.data';
import { Customer } from '../domain/customer.entity';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerAlreadyExistsError } from '../domain/errors/customer-already-exists.error';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      include: {
        address: true,
        sector: true,
      },
    });
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    try {
      /*
       * A nested create runs customer + address in one implicit transaction and
       * resolves their order on its own — the FK lives on customer.address_id,
       * so the address row has to exist first.
       */
      return await this.prisma.customer.create({
        data: {
          name: data.name,
          document: data.document,
          documentType: data.documentType,
          email: data.email,
          ownerName: data.ownerName,
          ownerEmail: data.ownerEmail,
          ownerPhone: data.ownerPhone,
          sector: { connect: { id: data.sectorId } },
          address: {
            create: {
              type: data.address.type,
              street: data.address.street,
              number: data.address.number,
              city: data.address.city,
              state: data.address.state,
              postalCode: data.address.postalCode,
              countryCode: data.address.countryCode,
            },
          },
        },
        include: {
          address: true,
          sector: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new CustomerAlreadyExistsError(data.document);
      }

      throw error;
    }
  }
}

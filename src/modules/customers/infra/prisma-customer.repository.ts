import { Injectable } from '@nestjs/common';
import { LicenseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerData } from '../domain/create-customer.data';
import { Customer } from '../domain/customer.entity';
import { CustomerListItem } from '../domain/customer-list-item';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerAddressNotFoundError } from '../domain/errors/customer-address-not-found.error';
import { CustomerAlreadyExistsError } from '../domain/errors/customer-already-exists.error';
import type { UpdateCustomerData } from '../domain/update-customer.data';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const CUSTOMER_DETAIL_INCLUDE = {
  address: true,
  sector: true,
} as const;

function withoutUndefinedValues<T extends Record<string, unknown>>(
  input: T,
): Partial<T> {
  const result: Partial<T> = {};

  for (const key of Object.keys(input) as (keyof T)[]) {
    if (input[key] !== undefined) {
      result[key] = input[key];
    }
  }

  return result;
}

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(ownerUserId: string): Promise<CustomerListItem[]> {
    const customers = await this.prisma.customer.findMany({
      where: { ownerUserId, isDeleted: false },
      include: {
        address: true,
        sector: true,
        _count: {
          select: {
            licenses: true,
          },
        },
        licenses: {
          where: {
            status: LicenseStatus.REGULAR,
          },
          select: {
            id: true,
          },
        },
      },
    });

    return customers.map(({ _count, licenses, ...customer }) => ({
      ...customer,
      totalLicenses: _count.licenses,
      regularLicenses: licenses.length,
    }));
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
          // From the token, never from the request body.
          ownerUser: { connect: { id: data.ownerUserId } },
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
        /*
         * The unique index is (owner_user_id, document), so this only fires
         * when the same owner already registered the document — another
         * consultancy holding the same CNPJ is not a conflict (US01).
         */
        throw new CustomerAlreadyExistsError(data.document);
      }

      throw error;
    }
  }

  async findById(id: string, ownerUserId: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { id, ownerUserId },
      include: CUSTOMER_DETAIL_INCLUDE,
    });
  }

  async update(
    id: string,
    ownerUserId: string,
    data: UpdateCustomerData,
  ): Promise<Customer> {
    return this.prisma.$transaction(async (tx) => {
      // Owner-scoped inside the transaction too: the use case already checked
      // ownership, this keeps the write itself unable to touch a foreign row.
      const current = await tx.customer.findUniqueOrThrow({
        where: { id, ownerUserId },
      });

      if (data.address) {
        if (!current.addressId) {
          throw new CustomerAddressNotFoundError(id);
        }

        await tx.customerAddress.update({
          where: { id: current.addressId },
          data: withoutUndefinedValues({
            type: data.address.type,
            street: data.address.street,
            number: data.address.number,
            city: data.address.city,
            state: data.address.state,
            postalCode: data.address.postalCode,
            countryCode: data.address.countryCode,
          }),
        });
      }

      await tx.customer.update({
        where: { id, ownerUserId },
        data: withoutUndefinedValues({
          name: data.name,
          document: data.document,
          documentType: data.documentType,
          email: data.email,
          sectorId: data.sectorId,
          ownerName: data.ownerName,
          ownerEmail: data.ownerEmail,
          ownerPhone: data.ownerPhone,
        }),
      });

      return tx.customer.findUniqueOrThrow({
        where: { id, ownerUserId },
        include: CUSTOMER_DETAIL_INCLUDE,
      });
    });
  }

  async findOne(id: string, ownerUserId: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { id, ownerUserId, isDeleted: false },
      include: {
        address: true,
        sector: true,
      },
    });
  }

  async remove(id: string, ownerUserId: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { id, ownerUserId, isDeleted: false },
      select: { id: true },
    });

    if (!customer) {
      return false;
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { isDeleted: true },
    });

    return true;
  }
}

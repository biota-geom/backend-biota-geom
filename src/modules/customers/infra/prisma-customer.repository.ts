import { Injectable } from '@nestjs/common';
import type {
  Customer as PrismaCustomer,
  CustomerAddress,
  CustomerEnvironmentalTopic,
  Sector,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerRepository } from '../domain/customers.repository';
import { Customer } from '../domain/customer.entity';
import { CustomerAddressNotFoundError } from '../domain/errors/customer-address-not-found.error';
import type { UpdateCustomerData } from '../domain/update-customer.data';

type PrismaCustomerWithRelations = PrismaCustomer & {
  address: CustomerAddress | null;
  sector: Sector | null;
  environmentalTopics: CustomerEnvironmentalTopic[];
};

const CUSTOMER_DETAIL_INCLUDE = {
  address: true,
  sector: true,
  environmentalTopics: true,
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

  async findAll(): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      include: {
        address: true,
        sector: true,
      },
    });
  }

  async findById(id: string): Promise<Customer | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: CUSTOMER_DETAIL_INCLUDE,
    });

    return customer ? this.toDomain(customer) : null;
  }

  async update(id: string, data: UpdateCustomerData): Promise<Customer> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUniqueOrThrow({ where: { id } });

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
        where: { id },
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

      await tx.customerEnvironmentalTopic.deleteMany({
        where: { customerId: id },
      });

      if (data.esgIndicatorIds.length > 0) {
        await tx.customerEnvironmentalTopic.createMany({
          data: data.esgIndicatorIds.map((esgMetricId) => ({
            customerId: id,
            esgMetricId,
          })),
        });
      }

      return tx.customer.findUniqueOrThrow({
        where: { id },
        include: CUSTOMER_DETAIL_INCLUDE,
      });
    });

    return this.toDomain(updated);
  }

  private toDomain(customer: PrismaCustomerWithRelations): Customer {
    return {
      id: customer.id,
      name: customer.name,
      document: customer.document,
      documentType: customer.documentType,
      email: customer.email,
      ownerName: customer.ownerName,
      ownerEmail: customer.ownerEmail,
      ownerPhone: customer.ownerPhone,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      addressId: customer.addressId,
      address: customer.address,
      sectorId: customer.sectorId,
      sector: customer.sector,
      esgIndicatorIds: customer.environmentalTopics.map(
        (topic) => topic.esgMetricId,
      ),
    };
  }
}

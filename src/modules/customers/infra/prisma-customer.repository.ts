import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerRepository } from '../domain/customers.repository';
import { Customer } from '../domain/customer.entity';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: { isDeleted: false },
      include: {
        address: true,
        sector: true,
      },
    });
  }

  async findOne(id: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { id, isDeleted: false },
      include: {
        address: true,
        sector: true,
      },
    });
  }
}

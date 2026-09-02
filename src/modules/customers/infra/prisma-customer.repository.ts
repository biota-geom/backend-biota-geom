import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerRepository } from '../domain/customers.repository';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.customer.findMany({
      include: {
        address: true,
        sector: true,
      },
    });
  }
}

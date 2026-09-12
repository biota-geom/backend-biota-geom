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

  async remove(id: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { id, isDeleted: false },
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

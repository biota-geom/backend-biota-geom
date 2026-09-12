import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SectorsModule } from '../sectors/sectors.module';
import { CreateCustomerUseCase } from './application/create-customer.use-case';
import { ListCustomersUseCase } from './application/list-customers.use-case';
import { CustomerRepository } from './domain/customers.repository';
import { CustomersService } from './infra/customers.service';
import { PrismaCustomerRepository } from './infra/prisma-customer.repository';
import { CustomerController } from './presentation/customers.controller';

@Module({
  imports: [AuthModule, SectorsModule],
  controllers: [CustomerController],
  providers: [
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    ListCustomersUseCase,
    CreateCustomerUseCase,
    CustomersService,
  ],
})
export class CustomerModule {}

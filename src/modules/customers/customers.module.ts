import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FindCustomerUseCase } from './application/find-a-customer.use-case';
import { ListCustomersUseCase } from './application/list-customers.use-case';
import { CustomerRepository } from './domain/customers.repository';
import { CustomersService } from './infra/customers.service';
import { CustomerController } from './presentation/customers.controller';
import { PrismaCustomerRepository } from './infra/prisma-customer.repository';

@Module({
  imports: [AuthModule],
  controllers: [CustomerController],
  providers: [
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    ListCustomersUseCase,
    FindCustomerUseCase,
    CustomersService,
  ],
})
export class CustomerModule {}

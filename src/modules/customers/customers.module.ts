import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EsgMetricsModule } from '../esg-metrics/esg-metrics.module';
import { ListCustomersUseCase } from './application/list-customers.use-case';
import { UpdateCustomerUseCase } from './application/update-customer.use-case';
import { CustomerRepository } from './domain/customers.repository';
import { CustomersService } from './infra/customers.service';
import { CustomerController } from './presentation/customers.controller';
import { PrismaCustomerRepository } from './infra/prisma-customer.repository';

@Module({
  imports: [AuthModule, EsgMetricsModule],
  controllers: [CustomerController],
  providers: [
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    ListCustomersUseCase,
    UpdateCustomerUseCase,
    CustomersService,
  ],
})
export class CustomerModule {}

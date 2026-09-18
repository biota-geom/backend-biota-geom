import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SectorsModule } from '../sectors/sectors.module';
import { CreateCustomerUseCase } from './application/create-customer.use-case';
import { FindCustomerUseCase } from './application/find-a-customer.use-case';
import { LinkCustomerEsgMetricsUseCase } from './application/link-customer-esg-metrics.use-case';
import { ListCustomerEsgMetricsUseCase } from './application/list-customer-esg-metrics.use-case';
import { ListCustomersUseCase } from './application/list-customers.use-case';
import { RemoveCustomerUseCase } from './application/remove-customer.use-case';
import { UpdateCustomerUseCase } from './application/update-customer.use-case';
import { CustomerEsgMetricRepository } from './domain/customer-esg-metric.repository';
import { CustomerRepository } from './domain/customers.repository';
import { CustomersService } from './infra/customers.service';
import { PrismaCustomerEsgMetricRepository } from './infra/prisma-customer-esg-metric.repository';
import { PrismaCustomerRepository } from './infra/prisma-customer.repository';
import { CustomerController } from './presentation/customers.controller';

@Module({
  imports: [AuthModule, SectorsModule],
  controllers: [CustomerController],
  providers: [
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    {
      provide: CustomerEsgMetricRepository,
      useClass: PrismaCustomerEsgMetricRepository,
    },
    ListCustomersUseCase,
    CreateCustomerUseCase,
    FindCustomerUseCase,
    RemoveCustomerUseCase,
    UpdateCustomerUseCase,
    LinkCustomerEsgMetricsUseCase,
    ListCustomerEsgMetricsUseCase,
    CustomersService,
  ],
  // CustomerRepository is reused by the licenses module (LicensesModule) to
  // scope license creation to the authenticated owner's own customers.
  exports: [CustomerRepository],
})
export class CustomerModule {}

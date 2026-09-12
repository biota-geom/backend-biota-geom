import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LinkCustomerEsgMetricsUseCase } from './application/link-customer-esg-metrics.use-case';
import { ListCustomerEsgMetricsUseCase } from './application/list-customer-esg-metrics.use-case';
import { ListCustomersUseCase } from './application/list-customers.use-case';
import { CustomerEsgMetricRepository } from './domain/customer-esg-metric.repository';
import { CustomerRepository } from './domain/customers.repository';
import { CustomersService } from './infra/customers.service';
import { PrismaCustomerEsgMetricRepository } from './infra/prisma-customer-esg-metric.repository';
import { PrismaCustomerRepository } from './infra/prisma-customer.repository';
import { CustomerController } from './presentation/customers.controller';

@Module({
  imports: [AuthModule],
  controllers: [CustomerController],
  providers: [
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    {
      provide: CustomerEsgMetricRepository,
      useClass: PrismaCustomerEsgMetricRepository,
    },
    ListCustomersUseCase,
    LinkCustomerEsgMetricsUseCase,
    ListCustomerEsgMetricsUseCase,
    CustomersService,
  ],
})
export class CustomerModule {}

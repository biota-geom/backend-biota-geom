import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListCustomersUseCase } from './application/list-customers.use-case';
import { CustomerRepository } from './domain/customers.repository';
import { CustomersService } from './infra/customers.service';
import { CustomerController } from './presentation/customers.controller';

@Module({
  imports: [AuthModule],
  controllers: [CustomerController],
  providers: [CustomerRepository, ListCustomersUseCase, CustomersService],
})
export class CustomerModule {}

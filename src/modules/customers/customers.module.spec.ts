import { MODULE_METADATA } from '@nestjs/common/constants';
import { LicenseRepository } from '../licenses/domain/licenses.repository';
import { PrismaLicenseRepository } from '../licenses/infra/prisma-license.repository';
import { ListCustomerDashboardLicensesUseCase } from './application/list-customer-dashboard-licenses.use-case';
import { CustomerModule } from './customers.module';
import { CustomersService } from './infra/customers.service';

describe('CustomerModule', () => {
  it('is defined', () => {
    expect(CustomerModule).toBeDefined();
  });

  it('registers the dependencies for customer dashboard license lookup', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CustomerModule,
    ) as unknown[];

    expect(providers).toContain(ListCustomerDashboardLicensesUseCase);
    expect(providers).toContain(CustomersService);
    expect(providers).toContainEqual({
      provide: LicenseRepository,
      useClass: PrismaLicenseRepository,
    });
  });
});

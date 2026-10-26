import { MODULE_METADATA } from '@nestjs/common/constants';
import { LicenseRepository } from '../licenses/domain/licenses.repository';
import { PrismaLicenseRepository } from '../licenses/infra/prisma-license.repository';
import { ListCustomerDashboardLicensesUseCase } from './application/list-customer-dashboard-licenses.use-case';
import { CustomerModule } from './customers.module';
import { LicensesModule } from '../licenses/licenses.module';

describe('CustomerModule', () => {
  it('is defined', () => {
    expect(CustomerModule).toBeDefined();
  });

  it('resolves the licenses module forward reference', () => {
    const imports = Reflect.getMetadata('imports', CustomerModule) as Array<{
      forwardRef?: () => unknown;
    }>;
    const licensesModuleReference = imports.find(
      (moduleReference) => moduleReference.forwardRef,
    );

    expect(licensesModuleReference?.forwardRef?.()).toBe(LicensesModule);
  });
});

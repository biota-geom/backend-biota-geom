import { LicensesModule } from './licenses.module';
import { CustomerModule } from '../customers/customers.module';

describe('LicensesModule', () => {
  it('is defined', () => {
    expect(LicensesModule).toBeDefined();
  });

  it('resolves the customer module forward reference', () => {
    const imports = Reflect.getMetadata('imports', LicensesModule) as Array<{
      forwardRef?: () => unknown;
    }>;
    const customerModuleReference = imports.find(
      (moduleReference) => moduleReference.forwardRef,
    );

    expect(customerModuleReference?.forwardRef?.()).toBe(CustomerModule);
  });
});

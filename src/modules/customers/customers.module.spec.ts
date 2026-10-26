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

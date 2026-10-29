import { CustomerModule } from './customers.module';
import { EsgIndicatorsModule } from '../esg-indicators/esg-indicators.module';
import { LicensesModule } from '../licenses/licenses.module';

describe('CustomerModule', () => {
  it('is defined', () => {
    expect(CustomerModule).toBeDefined();
  });

  it('resolves every module forward reference', () => {
    const imports = Reflect.getMetadata('imports', CustomerModule) as Array<{
      forwardRef?: () => unknown;
    }>;
    const resolved = imports
      .filter((moduleReference) => moduleReference.forwardRef)
      .map((moduleReference) => moduleReference.forwardRef?.());

    // Both are circular: licenses and ESG indicators import this module back.
    expect(resolved).toEqual([LicensesModule, EsgIndicatorsModule]);
  });
});

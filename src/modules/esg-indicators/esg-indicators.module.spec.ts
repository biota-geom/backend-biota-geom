import { CustomerModule } from '../customers/customers.module';
import { EsgIndicatorsModule } from './esg-indicators.module';

describe('EsgIndicatorsModule', () => {
  it('is defined', () => {
    expect(EsgIndicatorsModule).toBeDefined();
  });

  it('resolves the customers module forward reference', () => {
    const imports = Reflect.getMetadata(
      'imports',
      EsgIndicatorsModule,
    ) as Array<{ forwardRef?: () => unknown }>;
    const reference = imports.find(
      (moduleReference) => moduleReference.forwardRef,
    );

    expect(reference?.forwardRef?.()).toBe(CustomerModule);
  });
});

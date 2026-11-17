import { FactoryProvider, Provider } from '@nestjs/common';
import { AlertsModule } from './alerts.module';
import {
  ALERT_GENERATORS,
  type AlertGenerator,
} from './domain/alert-generator';

function isAlertGeneratorsProvider(
  provider: Provider,
): provider is FactoryProvider<AlertGenerator[]> {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    'provide' in provider &&
    provider.provide === ALERT_GENERATORS
  );
}

describe('AlertsModule', () => {
  it('builds the generator list from every registered generator', () => {
    expect(new AlertsModule()).toBeInstanceOf(AlertsModule);

    const providers = Reflect.getMetadata(
      'providers',
      AlertsModule,
    ) as Provider[];
    const generatorsProvider = providers.find(isAlertGeneratorsProvider);
    if (!generatorsProvider) {
      throw new Error('ALERT_GENERATORS provider is not registered');
    }

    const licenses: AlertGenerator = {
      type: 'LICENSE_EXPIRATION',
      generate: () => Promise.resolve([]),
    };
    const conditions: AlertGenerator = {
      type: 'CONDITION_DUE',
      generate: () => Promise.resolve([]),
    };

    expect(generatorsProvider.useFactory(licenses, conditions)).toEqual([
      licenses,
      conditions,
    ]);
  });
});

import { AlertsModule } from './alerts.module';
import { ALERT_GENERATORS } from './domain/alert-generator';
import { LicenseExpirationAlertGenerator } from './application/license-expiration-alert.generator';

describe('AlertsModule', () => {
  it('is defined', () => {
    expect(AlertsModule).toBeDefined();
  });

  it('registers the license generator in ALERT_GENERATORS', () => {
    const providers = Reflect.getMetadata('providers', AlertsModule) as Array<{
      provide?: unknown;
      useFactory?: (...args: unknown[]) => unknown;
    }>;
    const generators = providers.find(
      (provider) => provider.provide === ALERT_GENERATORS,
    );
    const licenses = {} as LicenseExpirationAlertGenerator;

    expect(generators?.useFactory?.(licenses)).toEqual([licenses]);
  });
});

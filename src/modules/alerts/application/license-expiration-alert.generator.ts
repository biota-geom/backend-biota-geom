import { Injectable } from '@nestjs/common';
import { currentLicenseStatus } from '../../licenses/domain/license-status.calculator';
import { AlertSeverity } from '../domain/alert.entity';
import { alertDedupeKey } from '../domain/alert-dedupe-key';
import {
  AlertGenerator,
  AlertSyncScope,
  DesiredAlert,
} from '../domain/alert-generator';
import { LicenseExpirationSource } from '../domain/license-expiration-source';

const SEVERITY_BY_STATUS: Partial<Record<string, AlertSeverity>> = {
  ATTENTION: 'MEDIUM',
  EXPIRED: 'HIGH',
};

@Injectable()
export class LicenseExpirationAlertGenerator implements AlertGenerator {
  readonly type = 'LICENSE_EXPIRATION' as const;

  constructor(private readonly licenses: LicenseExpirationSource) {}

  async generate(scope: AlertSyncScope, now: Date): Promise<DesiredAlert[]> {
    const licenses = await this.licenses.list(scope);
    const desired: DesiredAlert[] = [];
    for (const license of licenses) {
      const severity = SEVERITY_BY_STATUS[currentLicenseStatus(license, now)];
      if (!severity) continue;
      desired.push({
        type: this.type,
        severity,
        dedupeKey: alertDedupeKey(
          this.type,
          license.id,
          severity,
          license.expirationDate,
        ),
        dueDate: license.expirationDate,
        customerId: license.customerId,
        licenseId: license.id,
        licenseConditionId: null,
      });
    }
    return desired;
  }
}

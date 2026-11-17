import { Injectable } from '@nestjs/common';
import { calculateLicenseConditionRiskLevel } from '../../licenses/domain/license-condition-risk.calculator';
import { LicenseConditionRiskLevel } from '../../licenses/domain/license-condition-risk-level';
import { AlertSeverity } from '../domain/alert.entity';
import { alertDedupeKey } from '../domain/alert-dedupe-key';
import {
  AlertGenerator,
  AlertSyncScope,
  DesiredAlert,
} from '../domain/alert-generator';
import {
  ConditionDueSource,
  ConditionForAlert,
} from '../domain/condition-due-source';

const SEVERITY_BY_RISK: Record<LicenseConditionRiskLevel, AlertSeverity> = {
  [LicenseConditionRiskLevel.RISK]: 'HIGH',
  [LicenseConditionRiskLevel.ATTENTION]: 'MEDIUM',
  [LicenseConditionRiskLevel.REGULAR]: 'LOW',
};

@Injectable()
export class ConditionDueAlertGenerator implements AlertGenerator {
  readonly type = 'CONDITION_DUE' as const;

  constructor(private readonly conditions: ConditionDueSource) {}

  async generate(scope: AlertSyncScope, now: Date): Promise<DesiredAlert[]> {
    const conditions = await this.conditions.list(scope);
    const desired: DesiredAlert[] = [];
    for (const condition of conditions) {
      const severity = this.severityOf(condition, now);
      if (!severity) continue;
      desired.push({
        type: this.type,
        severity,
        dedupeKey: alertDedupeKey(
          this.type,
          condition.id,
          severity,
          condition.dueDate,
        ),
        dueDate: condition.dueDate,
        customerId: condition.customerId,
        licenseId: condition.licenseId,
        licenseConditionId: condition.id,
      });
    }
    return desired;
  }

  /** Risk wins; a regular condition only gets a reminder once its alert date comes. */
  private severityOf(
    condition: ConditionForAlert,
    now: Date,
  ): AlertSeverity | null {
    const risk = calculateLicenseConditionRiskLevel(condition.dueDate, now);
    if (risk !== LicenseConditionRiskLevel.REGULAR) {
      return SEVERITY_BY_RISK[risk];
    }
    if (condition.alertDate && condition.alertDate.getTime() <= now.getTime()) {
      return SEVERITY_BY_RISK[risk];
    }
    return null;
  }
}

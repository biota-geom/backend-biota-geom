import { PrismaClient } from '@prisma/client';
import { alertDedupeKey } from '../src/modules/alerts/domain/alert-dedupe-key';
import {
  AlertSeverity,
  AlertType,
} from '../src/modules/alerts/domain/alert.entity';
import { currentLicenseStatus } from '../src/modules/licenses/domain/license-status.calculator';
import { calculateLicenseConditionRiskLevel } from '../src/modules/licenses/domain/license-condition-risk.calculator';
import { LicenseConditionRiskLevel } from '../src/modules/licenses/domain/license-condition-risk-level';

export async function seedAlerts(prisma: PrismaClient, licenseIds: string[]) {
  const now = new Date();
  const licenses = await prisma.license.findMany({
    where: { id: { in: licenseIds } },
    include: { conditions: true },
  });

  for (const license of licenses) {
    const examples: {
      type: AlertType;
      severity: AlertSeverity;
      dueDate: Date;
      licenseConditionId: string | null;
    }[] = [];
    const status = currentLicenseStatus(license, now);
    if (status === 'ARCHIVED') continue;
    if (status === 'EXPIRED' || status === 'ATTENTION') {
      examples.push({
        type: 'LICENSE_EXPIRATION',
        severity: status === 'EXPIRED' ? 'HIGH' : 'MEDIUM',
        dueDate: license.expirationDate,
        licenseConditionId: null,
      });
    }
    for (const condition of license.conditions) {
      if (condition.conditionStatus === 'FULFILLED') continue;
      const risk = calculateLicenseConditionRiskLevel(condition.dueDate, now);
      examples.push({
        type: 'CONDITION_DUE',
        severity:
          risk === LicenseConditionRiskLevel.RISK
            ? 'HIGH'
            : risk === LicenseConditionRiskLevel.ATTENTION
              ? 'MEDIUM'
              : 'LOW',
        dueDate: condition.dueDate,
        licenseConditionId: condition.id,
      });
    }
    for (const example of examples) {
      const dedupeKey = alertDedupeKey(
        example.type,
        example.licenseConditionId ?? license.id,
        example.severity,
        example.dueDate,
      );
      // Re-running the seed moves demo deadlines. Retire old examples rather
      // than leaving open notifications pointing at the previous deadline.
      await prisma.alert.updateMany({
        where: {
          licenseId: license.id,
          licenseConditionId: example.licenseConditionId,
          type: example.type,
          dedupeKey: { not: dedupeKey },
          status: { in: ['OPEN', 'READ'] },
        },
        data: { status: 'RESOLVED' },
      });
      await prisma.alert.upsert({
        where: { dedupeKey },
        create: {
          ...example,
          dedupeKey,
          customerId: license.customerId,
          licenseId: license.id,
        },
        // Preserve read/resolved state when the seed is repeated the same day.
        update: { dueDate: example.dueDate },
      });
    }
  }
}

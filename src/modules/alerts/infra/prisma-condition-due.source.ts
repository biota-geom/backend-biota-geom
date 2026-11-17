import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertSyncScope } from '../domain/alert-generator';
import {
  ConditionDueSource,
  ConditionForAlert,
} from '../domain/condition-due-source';

@Injectable()
export class PrismaConditionDueSource implements ConditionDueSource {
  constructor(private readonly prisma: PrismaService) {}

  async list(scope: AlertSyncScope): Promise<ConditionForAlert[]> {
    const conditions = await this.prisma.licenseCondition.findMany({
      where: {
        conditionStatus: { not: 'FULFILLED' },
        license: {
          status: { not: 'ARCHIVED' },
          customer: { isDeleted: false, ownerUserId: scope.ownerUserId },
        },
      },
      select: {
        id: true,
        licenseId: true,
        dueDate: true,
        alertDate: true,
        license: { select: { customerId: true } },
      },
    });
    return conditions.map(({ license, ...condition }) => ({
      ...condition,
      customerId: license.customerId,
    }));
  }
}

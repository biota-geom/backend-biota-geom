import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertType } from '../domain/alert.entity';
import { AlertSyncScope, DesiredAlert } from '../domain/alert-generator';
import { AlertSyncRepository } from '../domain/alert-sync.repository';

@Injectable()
export class PrismaAlertSyncRepository implements AlertSyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMissing(alerts: DesiredAlert[]) {
    if (!alerts.length) return 0;
    // skipDuplicates is ON CONFLICT DO NOTHING: safe with concurrent runs.
    const result = await this.prisma.alert.createMany({
      data: alerts,
      skipDuplicates: true,
    });
    return result.count;
  }

  async resolveStale(
    scope: AlertSyncScope,
    type: AlertType,
    keepDedupeKeys: string[],
  ) {
    const where: Prisma.AlertWhereInput = {
      type,
      status: { in: ['OPEN', 'READ'] },
      dedupeKey: { not: null, notIn: keepDedupeKeys },
      customer: { isDeleted: false, ownerUserId: scope.ownerUserId },
    };
    const result = await this.prisma.alert.updateMany({
      where,
      data: { status: 'RESOLVED' },
    });
    return result.count;
  }
}

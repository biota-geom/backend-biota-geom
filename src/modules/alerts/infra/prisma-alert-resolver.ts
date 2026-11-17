import { Injectable } from '@nestjs/common';
import { AlertStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertResolver } from '../domain/alert-resolver';

const PENDING_STATUSES = [AlertStatus.OPEN, AlertStatus.READ];

@Injectable()
export class PrismaAlertResolver implements AlertResolver<Prisma.TransactionClient> {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForLicense(
    licenseId: string,
    transaction?: Prisma.TransactionClient,
  ): Promise<number> {
    return this.resolve(
      {
        OR: [{ licenseId }, { licenseCondition: { licenseId } }],
      },
      transaction,
    );
  }

  async resolveForConditions(
    conditionIds: string[],
    transaction?: Prisma.TransactionClient,
  ): Promise<number> {
    if (conditionIds.length === 0) return 0;
    return this.resolve(
      { licenseConditionId: { in: conditionIds } },
      transaction,
    );
  }

  private async resolve(
    where: Prisma.AlertWhereInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = transaction ?? this.prisma;
    const { count } = await client.alert.updateMany({
      where: { ...where, status: { in: PENDING_STATUSES } },
      data: { status: AlertStatus.RESOLVED },
    });
    return count;
  }
}

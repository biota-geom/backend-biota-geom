import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IndicatorRecordChange } from '../domain/esg-indicator';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';

@Injectable()
export class PrismaEsgIndicatorRecordRepository extends EsgIndicatorRecordRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findValuesByMonth(
    customerId: string,
    referenceMonth: Date,
  ): Promise<Map<string, number>> {
    const records = await this.prisma.esgIndicatorRecord.findMany({
      where: { customerId, referenceMonth },
      select: { indicatorId: true, value: true },
    });

    return new Map(
      records.map((record) => [record.indicatorId, record.value.toNumber()]),
    );
  }

  async saveMonth(
    customerId: string,
    referenceMonth: Date,
    changes: IndicatorRecordChange[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const { indicatorId, value } of changes) {
        const key = { customerId, indicatorId, referenceMonth };

        if (value === null) {
          await tx.esgIndicatorRecord.deleteMany({ where: key });
          continue;
        }

        // The unique index (customer, indicator, month) is what keeps this a
        // correction of the existing row instead of a second record.
        await tx.esgIndicatorRecord.upsert({
          where: { customerId_indicatorId_referenceMonth: key },
          create: { ...key, value },
          update: { value },
        });
      }
    });
  }
}

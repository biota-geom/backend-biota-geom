import { Injectable } from '@nestjs/common';
import { EsgIndicatorRecord } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ESG_INDICATORS,
  EsgIndicatorChanges,
  EsgIndicatorValues,
} from '../domain/esg-indicator';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';

type StoredValue = Pick<EsgIndicatorRecord, 'indicator' | 'value'>;

@Injectable()
export class PrismaEsgIndicatorRecordRepository extends EsgIndicatorRecordRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByMonth(
    customerId: string,
    referenceMonth: Date,
  ): Promise<EsgIndicatorValues> {
    const records = await this.prisma.esgIndicatorRecord.findMany({
      where: { customerId, referenceMonth },
      select: { indicator: true, value: true },
    });

    return this.toValues(records);
  }

  async saveMonth(
    customerId: string,
    referenceMonth: Date,
    changes: EsgIndicatorChanges,
  ): Promise<EsgIndicatorValues> {
    return this.prisma.$transaction(async (tx) => {
      for (const indicator of ESG_INDICATORS) {
        const value = changes[indicator];

        if (value === undefined) {
          continue;
        }

        const key = { customerId, indicator, referenceMonth };

        if (value === null) {
          await tx.esgIndicatorRecord.deleteMany({ where: key });
          continue;
        }

        // The unique index (customer, indicator, month) is what keeps this a
        // correction of the existing row instead of a second record.
        await tx.esgIndicatorRecord.upsert({
          where: { customerId_indicator_referenceMonth: key },
          create: { ...key, value },
          update: { value },
        });
      }

      const records = await tx.esgIndicatorRecord.findMany({
        where: { customerId, referenceMonth },
        select: { indicator: true, value: true },
      });

      return this.toValues(records);
    });
  }

  private toValues(records: StoredValue[]): EsgIndicatorValues {
    const values: EsgIndicatorValues = {
      WATER: null,
      WASTE: null,
      EMPLOYEES: null,
      ENERGY: null,
    };

    for (const record of records) {
      values[record.indicator] = record.value.toNumber();
    }

    return values;
  }
}

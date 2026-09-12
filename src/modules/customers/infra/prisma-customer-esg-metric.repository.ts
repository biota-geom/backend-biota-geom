import { Injectable } from '@nestjs/common';
import { EsgMetric as PrismaEsgMetric, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { EsgMetricEntity } from '../../esg-metrics/domain/entities/esg-metric.entity';
import { CustomerEsgMetricRepository } from '../domain/customer-esg-metric.repository';
import { EsgMetricsNotFoundError } from '../domain/errors/esg-metrics-not-found.error';

const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class PrismaCustomerEsgMetricRepository extends CustomerEsgMetricRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async replaceAll(customerId: string, metricIds: string[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.customerEsgMetric.deleteMany({ where: { customerId } });

        if (metricIds.length === 0) {
          return;
        }

        await tx.customerEsgMetric.createMany({
          data: metricIds.map((esgMetricId) => ({ customerId, esgMetricId })),
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new EsgMetricsNotFoundError();
      }

      throw error;
    }
  }

  async findMetricsByCustomerId(
    customerId: string,
  ): Promise<EsgMetricEntity[]> {
    const metrics = await this.prisma.esgMetric.findMany({
      where: {
        customerLinks: { some: { customerId } },
      },
      orderBy: [{ pillar: 'asc' }, { name: 'asc' }],
    });

    return metrics.map((metric) => this.toDomain(metric));
  }

  async findExistingMetricIds(metricIds: string[]): Promise<string[]> {
    const metrics = await this.prisma.esgMetric.findMany({
      where: { id: { in: metricIds } },
      select: { id: true },
    });

    return metrics.map((metric) => metric.id);
  }

  private toDomain(metric: PrismaEsgMetric): EsgMetricEntity {
    return new EsgMetricEntity(
      metric.id,
      metric.name,
      metric.unit,
      metric.pillar,
      metric.customerId,
      metric.griStandardId,
    );
  }
}

import { Injectable } from '@nestjs/common';
import { EsgMetric, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerIndicatorRepository } from '../domain/customer-indicators.repository';
import { IndicatorAlreadyExistsError } from '../domain/errors/indicator-already-exists.error';
import {
  categoryToPillar,
  IndicatorDefinition,
  NewIndicator,
  pillarToCategory,
} from '../domain/esg-indicator';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaCustomerIndicatorRepository extends CustomerIndicatorRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findActive(customerId: string): Promise<IndicatorDefinition[]> {
    const metrics = await this.prisma.esgMetric.findMany({
      where: { customerLinks: { some: { customerId } } },
      orderBy: [{ pillar: 'asc' }, { name: 'asc' }],
    });

    return metrics.map((metric) => this.toDefinition(metric));
  }

  async findInCatalogByName(
    ownerUserId: string,
    name: string,
  ): Promise<IndicatorDefinition | null> {
    const metric = await this.prisma.esgMetric.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        OR: [{ customerId: null }, { customerId: ownerUserId }],
      },
      orderBy: { createdAt: 'asc' },
    });

    return metric ? this.toDefinition(metric) : null;
  }

  async link(customerId: string, indicatorId: string): Promise<void> {
    await this.prisma.customerEsgMetric.createMany({
      data: [{ customerId, esgMetricId: indicatorId }],
      skipDuplicates: true,
    });
  }

  async createAndLink(
    customerId: string,
    ownerUserId: string,
    data: NewIndicator,
  ): Promise<IndicatorDefinition> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const metric = await tx.esgMetric.create({
          data: {
            name: data.name,
            unit: data.unit,
            pillar: categoryToPillar(data.category),
            customerId: ownerUserId,
          },
        });

        await tx.customerEsgMetric.create({
          data: { customerId, esgMetricId: metric.id },
        });

        return this.toDefinition(metric);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new IndicatorAlreadyExistsError(data.name);
      }

      throw error;
    }
  }

  private toDefinition(metric: EsgMetric): IndicatorDefinition {
    return {
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      category: pillarToCategory(metric.pillar),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { EsgMetric as PrismaEsgMetric, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EsgMetricEntity } from '../../domain/entities/esg-metric.entity';
import { EsgMetricAlreadyExistsError } from '../../domain/errors/esg-metric-already-exists.error';
import {
  EsgMetricRepository,
  type EsgMetricData,
} from '../../domain/repositories/esg-metric.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaEsgMetricRepository extends EsgMetricRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: EsgMetricData): Promise<EsgMetricEntity> {
    try {
      const metric = await this.prisma.esgMetric.create({
        data: {
          name: data.name,
          unit: data.unit,
          pillar: data.pillar,
          customerId: data.customerId,
          griStandardId: data.griStandardId ?? null,
        },
      });

      return this.toDomain(metric);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new EsgMetricAlreadyExistsError(data.name);
      }

      throw error;
    }
  }

  async findByCustomerIdAndName(
    customerId: string,
    name: string,
  ): Promise<EsgMetricEntity | null> {
    const metric = await this.prisma.esgMetric.findUnique({
      where: { customerId_name: { customerId, name } },
    });

    return metric ? this.toDomain(metric) : null;
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

  private toPrismaPillar(pillar: EsgPillar): PrismaEsgPillar {
    return pillar.toUpperCase() as PrismaEsgPillar;
  }

  private toDomainPillar(pillar: PrismaEsgPillar): EsgPillar {
    return pillar.toLowerCase() as EsgPillar;
  }
}

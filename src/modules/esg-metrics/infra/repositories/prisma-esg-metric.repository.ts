import { Injectable } from '@nestjs/common';
import type { EsgPillar as PrismaEsgPillar } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  EsgMetricEntity,
  EsgPillar,
} from '../../domain/entities/esg-metric.entity';
import {
  EsgMetricRepository,
  type EsgMetricData,
} from '../../domain/repositories/esg-metric.repository';

@Injectable()
export class PrismaEsgMetricRepository extends EsgMetricRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: EsgMetricData): Promise<EsgMetricEntity> {
    const metric = await this.prisma.esgMetric.create({
      data: {
        name: data.name,
        unit: data.unit,
        pillar: this.toPrismaPillar(data.pillar),
        customerId: data.clientId,
        griStandardId: data.griStandardId ?? null,
      },
    });

    return {
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      pillar: this.toDomainPillar(metric.pillar),
      clientId: metric.customerId,
      griStandardId: metric.griStandardId,
    };
  }

  private toPrismaPillar(pillar: EsgPillar): PrismaEsgPillar {
    return pillar.toUpperCase() as PrismaEsgPillar;
  }

  private toDomainPillar(pillar: PrismaEsgPillar): EsgPillar {
    return pillar.toLowerCase() as EsgPillar;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { EsgMetricEntity } from '../../domain/entities/esg-metric.entity';
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
        pillar: data.pillar,
        clientId: data.clientId,
        griStandardId: data.griStandardId ?? null,
      },
    });

    return {
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      pillar: metric.pillar,
      clientId: metric.clientId,
      griStandardId: metric.griStandardId,
    };
  }
}

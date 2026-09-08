import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EsgMetricEntity } from '../../domain/entities/esg-metric.entity';
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
        customerId: data.customerId,
        griStandardId: data.griStandardId ?? null,
      },
    });

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

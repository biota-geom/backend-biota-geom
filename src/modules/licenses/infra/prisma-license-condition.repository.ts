import { Injectable } from '@nestjs/common';
import { LicenseCondition as PrismaLicenseCondition } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddLicenseConditionData } from '../domain/add-license-condition.data';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';

const WITH_CATEGORY = {
  esgMetric: { select: { id: true, name: true } },
} as const;

type PrismaLicenseConditionWithCategory = PrismaLicenseCondition & {
  esgMetric: { id: string; name: string };
};

@Injectable()
export class PrismaLicenseConditionRepository implements LicenseConditionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addMany(
    conditions: AddLicenseConditionData[],
  ): Promise<LicenseCondition[]> {
    const created = await this.prisma.$transaction(
      conditions.map((condition) =>
        this.prisma.licenseCondition.create({
          data: condition,
          include: WITH_CATEGORY,
        }),
      ),
    );

    return created.map((condition) => this.toDomain(condition));
  }

  async findAllByCustomerId(customerId: string): Promise<LicenseCondition[]> {
    const conditions = await this.prisma.licenseCondition.findMany({
      where: { license: { customerId } },
      include: WITH_CATEGORY,
      orderBy: { dueDate: 'asc' },
    });

    return conditions.map((condition) => this.toDomain(condition));
  }

  private toDomain(
    condition: PrismaLicenseConditionWithCategory,
  ): LicenseCondition {
    return {
      id: condition.id,
      licenseId: condition.licenseId,
      name: condition.name,
      description: condition.description,
      category: {
        id: condition.esgMetric.id,
        name: condition.esgMetric.name,
      },
      responsibleAgency: condition.responsibleAgency,
      dueDate: condition.dueDate,
      status: condition.status,
      createdAt: condition.createdAt,
      updatedAt: condition.updatedAt,
    };
  }
}

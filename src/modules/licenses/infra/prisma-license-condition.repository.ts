import { Injectable } from '@nestjs/common';
import {
  LicenseCondition as PrismaLicenseCondition,
  LicenseStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddLicenseConditionData } from '../domain/add-license-condition.data';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';

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
        }),
      ),
    );

    return created.map((condition) => this.toDomain(condition));
  }

  async findAllByCustomerId(customerId: string): Promise<LicenseCondition[]> {
    const conditions = await this.prisma.licenseCondition.findMany({
      where: {
        license: { customerId, status: { not: LicenseStatus.ARCHIVED } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return conditions.map((condition) => this.toDomain(condition));
  }

  private toDomain(condition: PrismaLicenseCondition): LicenseCondition {
    return {
      id: condition.id,
      licenseId: condition.licenseId,
      name: condition.name,
      description: condition.description,
      environmentalDescriptor: condition.environmentalDescriptor,
      responsibleAgency: condition.responsibleAgency,
      dueDate: condition.dueDate,
      status: condition.status,
      hasDelivery: condition.hasDelivery,
      isViolated: condition.isViolated,
      createdAt: condition.createdAt,
      updatedAt: condition.updatedAt,
    };
  }
}

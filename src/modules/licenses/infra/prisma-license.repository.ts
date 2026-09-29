import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';
import { ConditionResponse } from '../domain/create-condition-response.entity';
import { ConditionData } from '../domain/license-condition.data';
import { LicenseCondition } from '../domain/condition.entity';
import { UpdateLicenseConditionData } from '../domain/update-license-condition.data';
import { LicenseConditionNotFoundError } from '../domain/errors/license-condition-not-found.error';
import { LicenseConditionCategory } from '../domain/license-condition-category.entity';

function toDomainCondition(
  condition: Prisma.LicenseConditionGetPayload<{
    include: { license: false };
  }>,
) {
  return {
    ...condition,
    title: condition.name,
    status: condition.conditionStatus,
  } as LicenseCondition;
}

@Injectable()
export class PrismaLicenseRepository implements LicenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLicenseData): Promise<License> {
    return this.prisma.license.create({
      data: {
        customer: { connect: { id: data.customerId } },
        type: data.type,
        processNumber: data.processNumber,
        issuingAgency: { connect: { id: data.issuingAgencyId } },
        issueDate: data.issueDate,
        expirationDate: data.expirationDate,
        status: data.status,
        documentUrl: data.documentUrl,
      },
      include: {
        issuingAgency: true,
      },
    });
  }

  async createConditions(data: ConditionData[]): Promise<ConditionResponse> {
    const result = await this.prisma.licenseCondition.createMany({ data });
    return { count: result.count };
  }

  async createConditionCategory(
    name: string,
  ): Promise<LicenseConditionCategory> {
    return this.prisma.licenseConditionCategory.create({ data: { name } });
  }

  async findByIdForCustomer(
    id: string,
    customerId: string,
  ): Promise<(License & { conditions: LicenseCondition[] }) | null> {
    const license = await this.prisma.license.findFirst({
      where: { id, customerId },
      include: { conditions: { orderBy: { itemNumber: 'asc' } } },
    });

    return license
      ? { ...license, conditions: license.conditions.map(toDomainCondition) }
      : null;
  }

  async updateCondition(
    data: UpdateLicenseConditionData,
  ): Promise<LicenseCondition> {
    return this.prisma.$transaction(
      async (transaction) => {
        const condition = await transaction.licenseCondition.findFirst({
          where: {
            id: data.id,
            licenseId: data.licenseId,
            license: { customerId: data.customerId },
          },
        });

        if (!condition) throw new LicenseConditionNotFoundError(data.id);

        const { title, status, isViolated, ...fields } = data.data;
        const updated = await transaction.licenseCondition.update({
          where: { id: data.id },
          data: {
            ...fields,
            ...(title !== undefined ? { name: title } : {}),
            ...(status !== undefined ? { conditionStatus: status } : {}),
            ...(isViolated !== undefined ? { isViolated } : {}),
          },
        });

        return toDomainCondition(updated);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async deleteCondition(
    id: string,
    licenseId: string,
    customerId: string,
  ): Promise<LicenseCondition> {
    return this.prisma.$transaction(
      async (transaction) => {
        const condition = await transaction.licenseCondition.findFirst({
          where: { id, licenseId, license: { customerId } },
        });

        if (!condition) throw new LicenseConditionNotFoundError(id);

        const deleted = await transaction.licenseCondition.delete({
          where: { id },
        });

        return toDomainCondition(deleted);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

  }

  async findById(id: string): Promise<License | null> {
    return this.prisma.license.findUnique({
      where: { id },
      include: { issuingAgency: true },
    });
  }

  async findAllByCustomerId(customerId: string): Promise<License[]> {
    return this.prisma.license.findMany({
      where: { customerId },
      include: { issuingAgency: true },
      orderBy: { expirationDate: 'asc' },
    });
  }
}

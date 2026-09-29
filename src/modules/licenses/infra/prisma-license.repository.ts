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
    return this.prisma.licenseCondition.createMany({
      data: data,
    });
  }

  async findByIdForCustomer(
    id: string,
    customerId: string,
  ): Promise<(License & { conditions: LicenseCondition[] }) | null> {
    return this.prisma.license.findFirst({
      where: { id, customerId },
      include: {
        conditions: { orderBy: { itemNumber: 'asc' } },
      },
    });
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

        return transaction.licenseCondition.update({
          where: { id: data.id },
          data: data.data,
        });
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

        return transaction.licenseCondition.delete({ where: { id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

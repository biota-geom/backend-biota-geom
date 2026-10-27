import { Injectable } from '@nestjs/common';
import { LicenseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';
import { ConditionResponse } from '../domain/create-condition-response.entity';
import { ConditionData } from '../domain/license-condition.data';
import { LicenseCondition } from '../domain/condition.entity';
import { UpdateLicenseConditionData } from '../domain/update-license-condition.data';
import { LicenseConditionNotFoundError } from '../domain/errors/license-condition-not-found.error';
import { RenewLicenseData } from '../domain/renew-license.data';

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
        previousLicense: data.previousLicenseId
          ? { connect: { id: data.previousLicenseId } }
          : undefined,
      },
      include: {
        issuingAgency: true,
      },
    });
  }

  async renew(data: RenewLicenseData): Promise<License> {
    return this.prisma.$transaction(
      async (transaction) => {
        const renewed = await transaction.license.create({
          data: {
            customer: { connect: { id: data.customerId } },
            type: data.type,
            processNumber: data.processNumber,
            issuingAgency: { connect: { id: data.issuingAgencyId } },
            issueDate: data.issueDate,
            expirationDate: data.expirationDate,
            status: data.status,
            documentUrl: data.documentUrl,
            previousLicense: { connect: { id: data.previousLicenseId } },
          },
          include: { issuingAgency: true },
        });

        await transaction.license.update({
          where: { id: data.previousLicenseId },
          data: { status: LicenseStatus.ARCHIVED },
        });

        return renewed;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createConditions(data: ConditionData[]): Promise<ConditionResponse> {
    const result = await this.prisma.licenseCondition.createMany({ data });
    return { count: result.count };
  }

  async findByIdForCustomer(
    id: string,
    customerId: string,
  ): Promise<(License & { conditions: LicenseCondition[] }) | null> {
    const license = await this.prisma.license.findFirst({
      where: { id, customerId },
      include: {
        issuingAgency: true,
        conditions: { orderBy: { createdAt: 'asc' } },
      },
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
        const environmentalDescriptorChanged =
          fields.environmentalDescriptor !== undefined &&
          fields.environmentalDescriptor !== condition.environmentalDescriptor;
        const updated = await transaction.licenseCondition.update({
          where: { id: data.id },
          data: {
            ...fields,
            ...(title !== undefined ? { name: title } : {}),
            ...(status !== undefined ? { conditionStatus: status } : {}),
            ...(isViolated !== undefined ? { isViolated } : {}),
            ...(environmentalDescriptorChanged
              ? { createdAt: new Date() }
              : {}),
          },
        });

        return toDomainCondition(updated);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async updateConditionForOwner(
    id: string,
    ownerUserId: string,
    data: UpdateLicenseConditionData['data'],
  ): Promise<LicenseCondition> {
    return this.prisma.$transaction(
      async (transaction) => {
        const condition = await transaction.licenseCondition.findFirst({
          where: { id, license: { customer: { ownerUserId } } },
        });

        if (!condition) throw new LicenseConditionNotFoundError(id);

        const { title, status, isViolated, ...fields } = data;
        const environmentalDescriptorChanged =
          fields.environmentalDescriptor !== undefined &&
          fields.environmentalDescriptor !== condition.environmentalDescriptor;
        const updated = await transaction.licenseCondition.update({
          where: { id },
          data: {
            ...fields,
            ...(title !== undefined ? { name: title } : {}),
            ...(status !== undefined ? { conditionStatus: status } : {}),
            ...(isViolated !== undefined ? { isViolated } : {}),
            ...(environmentalDescriptorChanged
              ? { createdAt: new Date() }
              : {}),
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

  async findByIdForOwner(
    id: string,
    ownerUserId: string,
  ): Promise<License | null> {
    return this.prisma.license.findFirst({
      where: { id, customer: { ownerUserId } },
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

  async findCustomerLicenses(
    customerId: string,
  ): Promise<Array<License & { conditions: LicenseCondition[] }>> {
    const licenses = await this.prisma.license.findMany({
      where: { customerId },
      include: { conditions: { orderBy: { createdAt: 'asc' } } },
    });

    return licenses.map((license) => ({
      ...license,
      conditions: license.conditions.map(toDomainCondition),
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { ConditionStatus, LicenseStatus, Prisma } from '@prisma/client';
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
import { assertEveryConditionDecided } from '../domain/renewal-conditions.policy';
import {
  ConditionFulfillmentItem,
  SaveConditionsFulfillmentData,
} from '../domain/save-conditions-fulfillment.data';
import {
  CONDITION_ORDER,
  nextConditionPosition,
  withNextPositions,
} from './license-condition-position';

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
        issuingAgency: data.issuingAgency,
        issueDate: data.issueDate,
        expirationDate: data.expirationDate,
        status: data.status,
        documentUrl: data.documentUrl,
        previousLicense: data.previousLicenseId
          ? { connect: { id: data.previousLicenseId } }
          : undefined,
      },
    });
  }

  async renew(data: RenewLicenseData): Promise<License> {
    return this.prisma.$transaction(
      async (transaction) => {
        // Read inside the transaction, so the decisions are checked against
        // the conditions this renewal is about to update and copy.
        const conditions = await transaction.licenseCondition.findMany({
          where: { licenseId: data.previousLicenseId },
          orderBy: CONDITION_ORDER,
        });
        assertEveryConditionDecided(
          conditions.map((condition) => condition.id),
          data.conditions,
        );

        const renewed = await transaction.license.create({
          data: {
            customer: { connect: { id: data.customerId } },
            type: data.type,
            processNumber: data.processNumber,
            issuingAgency: data.issuingAgency,
            issueDate: data.issueDate,
            expirationDate: data.expirationDate,
            status: data.status,
            documentUrl: data.documentUrl,
            previousLicense: { connect: { id: data.previousLicenseId } },
          },
        });

        await transaction.license.update({
          where: { id: data.previousLicenseId },
          data: { status: LicenseStatus.ARCHIVED },
        });

        await this.applyConditionsFulfillment(
          transaction,
          data.previousLicenseId,
          data.conditions,
        );

        const dueDateById = new Map<string, Date>();
        data.conditions.forEach((decision) => {
          if (decision.copyToNew && decision.newDueDate) {
            dueDateById.set(decision.conditionId, decision.newDueDate);
          }
        });
        // `conditions` is in the previous license's order, so the copies are
        // numbered the same way on the new one.
        await this.insertConditions(
          transaction,
          conditions
            .filter((source) => dueDateById.has(source.id))
            .map((source) => {
              const dueDate = dueDateById.get(source.id) as Date;

              return {
                licenseId: renewed.id,
                name: source.name,
                environmentalDescriptor: source.environmentalDescriptor,
                description: source.description,
                responsibleAgency: source.responsibleAgency,
                responsibleName: source.responsibleName,
                conditionType: source.conditionType,
                periodicity: source.periodicity,
                hasDelivery: source.hasDelivery,
                // Same pair the condition form writes: the page shows
                // `deadline`, the compliance rules read `dueDate`.
                deadline: dueDate,
                dueDate,
              };
            }),
        );

        return renewed;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createConditions(data: ConditionData[]): Promise<ConditionResponse> {
    const count = await this.prisma.$transaction((transaction) =>
      this.insertConditions(transaction, data),
    );
    return { count };
  }

  /* Appends the rows after the license's current conditions, in order. */
  private async insertConditions(
    client: Prisma.TransactionClient,
    rows: Prisma.LicenseConditionCreateManyInput[],
  ): Promise<number> {
    if (rows.length === 0) return 0;

    const result = await client.licenseCondition.createMany({
      data: await withNextPositions(client, rows),
    });
    return result.count;
  }

  async findByIdForCustomer(
    id: string,
    customerId: string,
  ): Promise<(License & { conditions: LicenseCondition[] }) | null> {
    const license = await this.prisma.license.findFirst({
      where: { id, customerId },
      include: {
        conditions: { orderBy: CONDITION_ORDER },
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
            // Moving to another descriptor appends the condition, so it is
            // numbered last in its new group.
            ...(environmentalDescriptorChanged
              ? {
                  position: await nextConditionPosition(
                    transaction,
                    condition.licenseId,
                  ),
                }
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
            // Moving to another descriptor appends the condition, so it is
            // numbered last in its new group.
            ...(environmentalDescriptorChanged
              ? {
                  position: await nextConditionPosition(
                    transaction,
                    condition.licenseId,
                  ),
                }
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
    });
  }

  async findByIdForOwner(
    id: string,
    ownerUserId: string,
  ): Promise<License | null> {
    return this.prisma.license.findFirst({
      where: { id, customer: { ownerUserId } },
    });
  }

  async findByIdForOwnerWithConditions(
    id: string,
    ownerUserId: string,
  ): Promise<(License & { conditions: LicenseCondition[] }) | null> {
    const license = await this.prisma.license.findFirst({
      where: { id, customer: { ownerUserId } },
      include: { conditions: { orderBy: CONDITION_ORDER } },
    });

    return license
      ? { ...license, conditions: license.conditions.map(toDomainCondition) }
      : null;
  }

  async findAllByCustomerId(customerId: string): Promise<License[]> {
    return this.prisma.license.findMany({
      where: { customerId },
      orderBy: { expirationDate: 'asc' },
    });
  }

  async saveConditionsFulfillment(
    data: SaveConditionsFulfillmentData,
  ): Promise<void> {
    await this.prisma.$transaction((transaction) =>
      this.applyConditionsFulfillment(transaction, data.licenseId, data.items),
    );
  }

  /*
   * Records the decisions without rewriting what is already recorded: a
   * condition that was fulfilled keeps its completion date, and "not
   * fulfilled" only reopens a fulfilled one, so an overdue one stays overdue.
   */
  private async applyConditionsFulfillment(
    client: Prisma.TransactionClient,
    licenseId: string,
    items: ConditionFulfillmentItem[],
  ): Promise<void> {
    const fulfilledIds = items
      .filter((item) => item.fulfilled)
      .map((item) => item.conditionId);
    const notFulfilledIds = items
      .filter((item) => !item.fulfilled)
      .map((item) => item.conditionId);

    if (fulfilledIds.length > 0) {
      await client.licenseCondition.updateMany({
        where: {
          licenseId,
          id: { in: fulfilledIds },
          OR: [
            { conditionStatus: { not: ConditionStatus.FULFILLED } },
            { completionDate: null },
          ],
        },
        data: {
          conditionStatus: ConditionStatus.FULFILLED,
          completionDate: new Date(),
        },
      });
    }

    if (notFulfilledIds.length > 0) {
      await client.licenseCondition.updateMany({
        where: {
          licenseId,
          id: { in: notFulfilledIds },
          conditionStatus: ConditionStatus.FULFILLED,
        },
        data: {
          conditionStatus: ConditionStatus.IN_PROGRESS,
          completionDate: null,
        },
      });
    }
  }

  async findCustomerLicenses(
    customerId: string,
  ): Promise<Array<License & { conditions: LicenseCondition[] }>> {
    const licenses = await this.prisma.license.findMany({
      where: { customerId },
      include: { conditions: { orderBy: CONDITION_ORDER } },
    });

    return licenses.map((license) => ({
      ...license,
      conditions: license.conditions.map(toDomainCondition),
    }));
  }
}

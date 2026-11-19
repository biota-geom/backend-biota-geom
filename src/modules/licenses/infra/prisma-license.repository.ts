import { assertAlertDateNotAfterDueDate } from '../domain/condition-alert-date.policy';
import { Injectable } from '@nestjs/common';
import { ConditionStatus, LicenseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertResolver } from '../../alerts/domain/alert-resolver';
import { CreateLicenseData } from '../domain/create-license.data';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';
import { ConditionResponse } from '../domain/create-condition-response.entity';
import { ConditionData } from '../domain/license-condition.data';
import { LicenseCondition } from '../domain/condition.entity';
import { UpdateLicenseConditionData } from '../domain/update-license-condition.data';
import { LicenseConditionNotFoundError } from '../domain/errors/license-condition-not-found.error';
import { InvalidRenewalDueDateError } from '../domain/errors/invalid-renewal-due-date.error';
import { RenewLicenseData } from '../domain/renew-license.data';
import {
  assertEveryConditionDecided,
  assertValidRenewalConditionHierarchy,
} from '../domain/renewal-conditions.policy';
import {
  ConditionFulfillmentItem,
  SaveConditionsFulfillmentData,
} from '../domain/save-conditions-fulfillment.data';
import {
  CONDITION_ORDER,
  nextConditionPosition,
  withNextPositions,
} from './license-condition-position';
import { assertValidConditionHierarchy } from './license-condition-hierarchy';

function toDomainCondition(
  condition: Prisma.LicenseConditionGetPayload<{
    include: { license: false };
  }>,
) {
  return {
    ...condition,
    parentConditionId: condition.parentConditionId ?? null,
    title: condition.name,
    status: condition.conditionStatus,
  } as LicenseCondition;
}

/*
 * A condition alert is tied to the due date in its dedupe key and only makes
 * sense while the condition is pending: once fulfilled or rescheduled, the
 * pending alerts are resolved (the next sync recreates them for the new date).
 */
function isConditionAlertObsolete(
  current: { dueDate: Date; conditionStatus: ConditionStatus },
  changes: { dueDate?: Date; status?: ConditionStatus },
): boolean {
  const rescheduled =
    changes.dueDate !== undefined &&
    changes.dueDate.getTime() !== current.dueDate.getTime();
  const fulfilled =
    changes.status === ConditionStatus.FULFILLED &&
    current.conditionStatus !== ConditionStatus.FULFILLED;
  return rescheduled || fulfilled;
}

@Injectable()
export class PrismaLicenseRepository implements LicenseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertResolver: AlertResolver<Prisma.TransactionClient>,
  ) {}

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
        assertValidRenewalConditionHierarchy(conditions, data.conditions);

        const legislationLinks = await transaction.licenseLegislation.findMany({
          where: { licenseId: data.previousLicenseId },
          select: {
            legislationId: true,
            source: true,
            citedExcerpt: true,
            impact: true,
            technicalAnalysis: true,
          },
        });

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

        if (legislationLinks.length > 0) {
          await transaction.licenseLegislation.createMany({
            data: legislationLinks.map((link) => ({
              licenseId: renewed.id,
              legislationId: link.legislationId,
              source: link.source,
              citedExcerpt: link.citedExcerpt,
              impact: link.impact,
              technicalAnalysis: link.technicalAnalysis,
              readAt: null,
            })),
          });
        }

        await transaction.license.update({
          where: { id: data.previousLicenseId },
          data: { status: LicenseStatus.ARCHIVED },
        });

        // The renewed license supersedes every pending alert of the old one.
        await this.alertResolver.resolveForLicense(
          data.previousLicenseId,
          transaction,
        );

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
        const conditionsToCopy = conditions.filter((source) =>
          dueDateById.has(source.id),
        );

        const copiedIdBySourceId = new Map<string, string>();
        let position = 1;
        // Copy roots first so every sub-item can connect to its copied parent.
        const orderedCopies = [
          ...conditionsToCopy.filter((source) => !source.parentConditionId),
          ...conditionsToCopy.filter((source) => source.parentConditionId),
        ];
        for (const source of orderedCopies) {
          const dueDate = dueDateById.get(source.id);
          if (!dueDate) {
            throw new InvalidRenewalDueDateError();
          }

          const copied = await transaction.licenseCondition.create({
            data: {
              licenseId: renewed.id,
              parentConditionId: source.parentConditionId
                ? (copiedIdBySourceId.get(source.parentConditionId) ?? null)
                : null,
              name: source.name,
              environmentalDescriptor: source.environmentalDescriptor,
              description: source.description,
              responsibleAgency: source.responsibleAgency,
              responsibleName: source.responsibleName,
              conditionType: source.conditionType,
              periodicity: source.periodicity,
              hasDelivery: source.hasDelivery,
              deadline: dueDate,
              dueDate,
              position: position++,
            },
          });
          copiedIdBySourceId.set(source.id, copied.id);
        }

        return renewed;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createConditions(data: ConditionData[]): Promise<ConditionResponse> {
    const count = await this.prisma.$transaction(async (transaction) => {
      for (const condition of data) {
        await assertValidConditionHierarchy(transaction, {
          parentConditionId: condition.parentConditionId ?? null,
          licenseId: condition.licenseId,
          environmentalDescriptor: condition.environmentalDescriptor,
        });
      }

      return this.insertConditions(transaction, data);
    });
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
        const update = withSynchronizedDueDate(data.data);
        assertResultingAlertDate(condition, update);

        const { title, status, isViolated, ...fields } = update;
        const environmentalDescriptorChanged =
          fields.environmentalDescriptor !== undefined &&
          fields.environmentalDescriptor !== condition.environmentalDescriptor;
        const parentConditionChanged =
          fields.parentConditionId !== undefined &&
          fields.parentConditionId !== (condition.parentConditionId ?? null);
        await assertValidConditionHierarchy(transaction, {
          conditionId: condition.id,
          parentConditionId:
            fields.parentConditionId === undefined
              ? (condition.parentConditionId ?? null)
              : fields.parentConditionId,
          licenseId: condition.licenseId,
          environmentalDescriptor:
            fields.environmentalDescriptor ?? condition.environmentalDescriptor,
          environmentalDescriptorChanged,
        });
        const updated = await transaction.licenseCondition.update({
          where: { id: data.id },
          data: {
            ...fields,
            ...(title !== undefined ? { name: title } : {}),
            ...(status !== undefined ? { conditionStatus: status } : {}),
            ...(isViolated !== undefined ? { isViolated } : {}),
            // Moving groups appends the condition at the end of its new group.
            ...(environmentalDescriptorChanged || parentConditionChanged
              ? {
                  position: await nextConditionPosition(
                    transaction,
                    condition.licenseId,
                  ),
                }
              : {}),
          },
        });

        if (isConditionAlertObsolete(condition, { ...fields, status })) {
          await this.alertResolver.resolveForConditions(
            [condition.id],
            transaction,
          );
        }

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
        const update = withSynchronizedDueDate(data);
        assertResultingAlertDate(condition, update);

        const { title, status, isViolated, ...fields } = update;
        const environmentalDescriptorChanged =
          fields.environmentalDescriptor !== undefined &&
          fields.environmentalDescriptor !== condition.environmentalDescriptor;
        const parentConditionChanged =
          fields.parentConditionId !== undefined &&
          fields.parentConditionId !== (condition.parentConditionId ?? null);
        await assertValidConditionHierarchy(transaction, {
          conditionId: condition.id,
          parentConditionId:
            fields.parentConditionId === undefined
              ? (condition.parentConditionId ?? null)
              : fields.parentConditionId,
          licenseId: condition.licenseId,
          environmentalDescriptor:
            fields.environmentalDescriptor ?? condition.environmentalDescriptor,
          environmentalDescriptorChanged,
        });
        const updated = await transaction.licenseCondition.update({
          where: { id },
          data: {
            ...fields,
            ...(title !== undefined ? { name: title } : {}),
            ...(status !== undefined ? { conditionStatus: status } : {}),
            ...(isViolated !== undefined ? { isViolated } : {}),
            // Moving groups appends the condition at the end of its new group.
            ...(environmentalDescriptorChanged || parentConditionChanged
              ? {
                  position: await nextConditionPosition(
                    transaction,
                    condition.licenseId,
                  ),
                }
              : {}),
          },
        });

        if (isConditionAlertObsolete(condition, { ...fields, status })) {
          await this.alertResolver.resolveForConditions(
            [condition.id],
            transaction,
          );
        }

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
    await this.prisma.$transaction(async (transaction) => {
      await this.applyConditionsFulfillment(
        transaction,
        data.licenseId,
        data.items,
      );
      await this.alertResolver.resolveForConditions(
        data.items
          .filter((item) => item.fulfilled)
          .map((item) => item.conditionId),
        transaction,
      );
    });
  }

  /*
   * Records the decisions without rewriting what is already recorded: a
   * condition that was fulfilled keeps its completion date, and "not
   * fulfilled" only reopens a fulfilled one. Reopening lands on OVERDUE when
   * the due date has passed, IN_PROGRESS otherwise.
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
      const now = new Date();

      // Reopening past its due date lands on OVERDUE, not IN_PROGRESS.
      await client.licenseCondition.updateMany({
        where: {
          licenseId,
          id: { in: notFulfilledIds },
          conditionStatus: ConditionStatus.FULFILLED,
          dueDate: { lt: now },
        },
        data: {
          conditionStatus: ConditionStatus.OVERDUE,
          completionDate: null,
        },
      });

      await client.licenseCondition.updateMany({
        where: {
          licenseId,
          id: { in: notFulfilledIds },
          conditionStatus: ConditionStatus.FULFILLED,
          dueDate: { gte: now },
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

function withSynchronizedDueDate(
  update: UpdateLicenseConditionData['data'],
): UpdateLicenseConditionData['data'] {
  const dueDate = update.dueDate ?? update.deadline;
  if (dueDate == null) return update;
  return {
    ...update,
    dueDate,
    deadline: update.deadline === null ? null : dueDate,
  };
}

/*
 * Checks the dates the condition will have after the update, so editing only
 * one of them is still validated against the stored value of the other.
 * Untouched dates are not re-checked.
 */
function assertResultingAlertDate(
  current: {
    alertDate: Date | null;
    dueDate: Date | null;
    deadline: Date | null;
  },
  update: UpdateLicenseConditionData['data'],
): void {
  if (update.alertDate === undefined && update.dueDate === undefined) return;

  assertAlertDateNotAfterDueDate(
    update.alertDate === undefined ? current.alertDate : update.alertDate,
    update.dueDate ?? current.dueDate ?? current.deadline,
  );
}

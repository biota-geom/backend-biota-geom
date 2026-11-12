import { Prisma } from '@prisma/client';
import { ConditionNestingNotAllowedError } from '../domain/errors/condition-nesting-not-allowed.error';
import { InvalidConditionParentError } from '../domain/errors/invalid-condition-parent.error';

type ConditionHierarchyClient = Pick<
  Prisma.TransactionClient,
  'licenseCondition'
>;

export async function assertValidConditionHierarchy(
  client: ConditionHierarchyClient,
  input: {
    conditionId?: string;
    parentConditionId: string | null;
    licenseId: string;
    environmentalDescriptor: string;
    environmentalDescriptorChanged?: boolean;
  },
): Promise<void> {
  if (input.parentConditionId !== null) {
    const parent = await client.licenseCondition.findFirst({
      where: {
        id: input.parentConditionId,
        licenseId: input.licenseId,
      },
      select: {
        id: true,
        parentConditionId: true,
        environmentalDescriptor: true,
      },
    });

    if (
      !parent ||
      parent.id === input.conditionId ||
      parent.environmentalDescriptor !== input.environmentalDescriptor
    ) {
      throw new InvalidConditionParentError();
    }

    if (parent.parentConditionId !== null) {
      throw new ConditionNestingNotAllowedError();
    }

    if (input.conditionId) {
      const existingChild = await client.licenseCondition.findFirst({
        where: { parentConditionId: input.conditionId },
        select: { id: true },
      });

      if (existingChild) throw new ConditionNestingNotAllowedError();
    }
  }

  if (input.conditionId && input.environmentalDescriptorChanged) {
    const child = await client.licenseCondition.findFirst({
      where: { parentConditionId: input.conditionId },
      select: { environmentalDescriptor: true },
    });

    if (
      child &&
      child.environmentalDescriptor !== input.environmentalDescriptor
    ) {
      throw new InvalidConditionParentError();
    }
  }
}

import { ConditionNestingNotAllowedError } from '../domain/errors/condition-nesting-not-allowed.error';
import { InvalidConditionParentError } from '../domain/errors/invalid-condition-parent.error';
import { assertValidConditionHierarchy } from './license-condition-hierarchy';

function buildClient(
  parent: unknown,
  child: unknown = null,
): {
  client: Parameters<typeof assertValidConditionHierarchy>[0];
  findFirst: jest.Mock;
} {
  const findFirst = jest
    .fn()
    .mockResolvedValueOnce(parent)
    .mockResolvedValueOnce(child);

  return {
    client: { licenseCondition: { findFirst } } as unknown as Parameters<
      typeof assertValidConditionHierarchy
    >[0],
    findFirst,
  };
}

describe('assertValidConditionHierarchy', () => {
  it('accepts a parent from the same license and descriptor', async () => {
    const { client, findFirst } = buildClient({
      id: 'parent',
      parentConditionId: null,
      environmentalDescriptor: 'Resíduos',
    });

    await expect(
      assertValidConditionHierarchy(client, {
        parentConditionId: 'parent',
        licenseId: 'license-1',
        environmentalDescriptor: 'Resíduos',
      }),
    ).resolves.toBeUndefined();
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'parent', licenseId: 'license-1' },
      select: {
        id: true,
        parentConditionId: true,
        environmentalDescriptor: true,
      },
    });
  });

  it.each([
    ['is missing or belongs to another license', null],
    [
      'has another environmental descriptor',
      {
        id: 'parent',
        parentConditionId: null,
        environmentalDescriptor: 'Água',
      },
    ],
  ])('rejects a parent that %s', async (_reason, parent) => {
    const { client } = buildClient(parent);

    await expect(
      assertValidConditionHierarchy(client, {
        parentConditionId: 'parent',
        licenseId: 'license-1',
        environmentalDescriptor: 'Resíduos',
      }),
    ).rejects.toThrow(InvalidConditionParentError);
  });

  it('rejects using a sub-item as a parent', async () => {
    const { client } = buildClient({
      id: 'parent',
      parentConditionId: 'top-level',
      environmentalDescriptor: 'Resíduos',
    });

    await expect(
      assertValidConditionHierarchy(client, {
        parentConditionId: 'parent',
        licenseId: 'license-1',
        environmentalDescriptor: 'Resíduos',
      }),
    ).rejects.toThrow(ConditionNestingNotAllowedError);
  });

  it('rejects converting a condition with children into a sub-item', async () => {
    const { client } = buildClient(
      {
        id: 'parent',
        parentConditionId: null,
        environmentalDescriptor: 'Resíduos',
      },
      { id: 'existing-child' },
    );

    await expect(
      assertValidConditionHierarchy(client, {
        conditionId: 'condition-with-child',
        parentConditionId: 'parent',
        licenseId: 'license-1',
        environmentalDescriptor: 'Resíduos',
      }),
    ).rejects.toThrow(ConditionNestingNotAllowedError);
  });
});

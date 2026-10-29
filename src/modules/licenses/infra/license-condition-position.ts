import { Prisma } from '@prisma/client';

/*
 * Read order of a license's conditions. `position` is the explicit order;
 * created_at and id only break ties between rows written before the column
 * existed, which all hold position 0.
 */
export const CONDITION_ORDER: Prisma.LicenseConditionOrderByWithRelationInput[] =
  [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }];

type ConditionPositionClient = Pick<
  Prisma.TransactionClient,
  'licenseCondition'
>;

/* Position right after the last condition of the license. */
export async function nextConditionPosition(
  client: ConditionPositionClient,
  licenseId: string,
): Promise<number> {
  const { _max } = await client.licenseCondition.aggregate({
    where: { licenseId },
    _max: { position: true },
  });

  return (_max.position ?? 0) + 1;
}

/*
 * Appends the rows after the conditions each license already has, keeping
 * the order they were given in.
 */
export async function withNextPositions<T extends { licenseId: string }>(
  client: ConditionPositionClient,
  rows: T[],
): Promise<Array<T & { position: number }>> {
  const nextByLicense = new Map<string, number>();
  for (const licenseId of new Set(rows.map((row) => row.licenseId))) {
    nextByLicense.set(
      licenseId,
      await nextConditionPosition(client, licenseId),
    );
  }

  return rows.map((row) => {
    const position = nextByLicense.get(row.licenseId) as number;
    nextByLicense.set(row.licenseId, position + 1);

    return { ...row, position };
  });
}

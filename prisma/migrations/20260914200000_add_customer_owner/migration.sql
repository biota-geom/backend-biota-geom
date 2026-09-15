-- Multi-tenant isolation: a customer (company/site) now belongs to the User
-- (consultancy) that registered it.
--
-- Hand-written instead of generated: the column is NOT NULL and `customers`
-- already has rows in every environment that has been used, so a backfill has
-- to run between ADD COLUMN and SET NOT NULL. `prisma migrate dev` refuses to
-- generate that step at all.

-- 1. Add it nullable first, which is the only form that succeeds on a table
--    that already has rows.
ALTER TABLE "customers" ADD COLUMN "owner_user_id" UUID;

-- 2. Backfill the existing portfolio.
DO $$
DECLARE
  backfill_owner_id UUID;
  orphan_count INT;
BEGIN
  -- Agreed rule: everything registered before ownership existed belongs to the
  -- admin account.
  SELECT "id" INTO backfill_owner_id
  FROM "users"
  WHERE "email" = 'admin@biotageom.com.br';

  -- A base seeded with a different domain/account still has to migrate, so fall
  -- back to the oldest account rather than leaving the rows unreachable.
  IF backfill_owner_id IS NULL THEN
    SELECT "id" INTO backfill_owner_id
    FROM "users"
    ORDER BY "created_at", "id"
    LIMIT 1;
  END IF;

  IF backfill_owner_id IS NOT NULL THEN
    UPDATE "customers"
    SET "owner_user_id" = backfill_owner_id
    WHERE "owner_user_id" IS NULL;
  END IF;

  SELECT count(*) INTO orphan_count
  FROM "customers"
  WHERE "owner_user_id" IS NULL;

  -- No users AND no customers (a fresh dev, CI or test database) is the normal
  -- case: there is nothing to backfill and the migration carries on to the NOT
  -- NULL below. Rows that could not be assigned are a different story — keeping
  -- them would need a nullable column (i.e. no isolation guarantee), and
  -- assigning them anywhere else would mean inventing an owner or silently
  -- deleting data. So the migration stops and says what to do instead.
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Cannot backfill customers.owner_user_id: % customer row(s) exist but no user was found to own them. Create the owning account (admin@biotageom.com.br) and run the migration again.',
      orphan_count;
  END IF;
END $$;

-- 3. Every row has an owner now, so the invariant can be enforced.
ALTER TABLE "customers" ALTER COLUMN "owner_user_id" SET NOT NULL;

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. CNPJ uniqueness moves from global to per owner (US01): two consultancies
--    may legitimately serve the same company, and a global index would leak the
--    existence of another tenant's customer through a 409. The swap cannot fail
--    on existing data because the global index it replaces already guaranteed
--    there are no duplicate documents to collide.
--    This index also covers lookups by "owner_user_id" alone (leftmost prefix),
--    so the FK needs no index of its own.
DROP INDEX "customers_document_key";

CREATE UNIQUE INDEX "customers_owner_user_id_document_key"
  ON "customers"("owner_user_id", "document");

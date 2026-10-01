-- The free-text "category" is replaced by a FK to the GRI parameter
-- (esg_metric) linked to the license's customer (customer_esg_metrics).

-- AlterTable: nullable first so existing rows can be backfilled.
ALTER TABLE "license_condition" ADD COLUMN "esg_metric_id" UUID;

-- Backfill: match the old free-text category (case-insensitive) against the
-- GRI parameters linked to the condition's customer.
UPDATE "license_condition" AS lc
SET "esg_metric_id" = matched."esg_metric_id"
FROM (
  SELECT DISTINCT ON (c."id") c."id" AS "condition_id", cem."esg_metric_id"
  FROM "license_condition" AS c
  JOIN "licenses" AS l ON l."id" = c."license_id"
  JOIN "customer_esg_metrics" AS cem ON cem."customer_id" = l."customer_id"
  JOIN "esg_metric" AS em ON em."id" = cem."esg_metric_id"
  WHERE lower(trim(em."name")) = lower(trim(c."category"))
  ORDER BY c."id", em."id"
) AS matched
WHERE lc."id" = matched."condition_id";

-- Conditions whose category matches no GRI parameter linked to the customer
-- cannot satisfy the new constraint and are removed.
DELETE FROM "license_condition" WHERE "esg_metric_id" IS NULL;

-- AlterTable
ALTER TABLE "license_condition" DROP COLUMN "category",
ALTER COLUMN "esg_metric_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "license_condition_esg_metric_id_idx" ON "license_condition"("esg_metric_id");

-- AddForeignKey
ALTER TABLE "license_condition" ADD CONSTRAINT "license_condition_esg_metric_id_fkey" FOREIGN KEY ("esg_metric_id") REFERENCES "esg_metric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

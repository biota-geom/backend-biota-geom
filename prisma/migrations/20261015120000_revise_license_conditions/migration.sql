ALTER TABLE "license_condition"
ADD COLUMN "environmental_descriptor" VARCHAR(120),
ADD COLUMN "has_delivery" BOOLEAN NOT NULL DEFAULT true;

UPDATE "license_condition" AS condition
SET "environmental_descriptor" = metric."name"
FROM "esg_metric" AS metric
WHERE condition."esg_metric_id" = metric."id";

ALTER TABLE "license_condition"
ALTER COLUMN "environmental_descriptor" SET NOT NULL;

DROP INDEX "license_condition_license_id_item_number_key";
DROP INDEX "license_condition_esg_metric_id_idx";
DROP INDEX "license_condition_target_metric_id_idx";

ALTER TABLE "license_condition"
DROP CONSTRAINT "license_condition_esg_metric_id_fkey",
DROP CONSTRAINT "license_condition_target_metric_id_fkey",
DROP COLUMN "item_number",
DROP COLUMN "esg_metric_id",
DROP COLUMN "target_metric_id",
DROP COLUMN "target_operator",
DROP COLUMN "target_value";

DROP TYPE "license_condition_target_operator";

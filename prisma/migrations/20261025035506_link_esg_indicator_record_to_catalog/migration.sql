-- Monthly records stop pointing at the fixed `esg_indicator` enum and point at
-- the company's indicator catalog (`esg_metric`, linked through
-- `customer_esg_metrics`) instead.

-- 1. The four fixed indicators become global catalog rows (created only when
--    the seed has not created them already).
INSERT INTO "esg_metric" ("id", "name", "unit", "pillar", "created_at", "updated_at")
SELECT gen_random_uuid(), fixed."name", fixed."unit", fixed."pillar"::"esg_pillar", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    VALUES
        ('Consumo de Água', 'm³', 'AMBIENTAL'),
        ('Resíduos Sólidos Gerados', 'ton', 'AMBIENTAL'),
        ('Número de Funcionários', 'pessoas', 'SOCIAL'),
        ('Consumo de Energia', 'kWh', 'AMBIENTAL')
) AS fixed ("name", "unit", "pillar")
WHERE NOT EXISTS (
    SELECT 1
    FROM "esg_metric" existing
    WHERE existing."customer_id" IS NULL AND existing."name" = fixed."name"
);

-- 2. Point every existing record at its catalog row.
ALTER TABLE "esg_indicator_record" ADD COLUMN "indicator_id" UUID;

UPDATE "esg_indicator_record" AS record
SET "indicator_id" = metric."id"
FROM "esg_metric" AS metric
WHERE metric."customer_id" IS NULL
  AND metric."name" = CASE record."indicator"
        WHEN 'WATER' THEN 'Consumo de Água'
        WHEN 'WASTE' THEN 'Resíduos Sólidos Gerados'
        WHEN 'EMPLOYEES' THEN 'Número de Funcionários'
        WHEN 'ENERGY' THEN 'Consumo de Energia'
      END;

-- 3. Companies that already reported an indicator keep seeing it: link it to
--    them (GET lists only the indicators linked to the company).
INSERT INTO "customer_esg_metrics" ("customer_id", "esg_metric_id")
SELECT DISTINCT "customer_id", "indicator_id"
FROM "esg_indicator_record"
ON CONFLICT DO NOTHING;

-- 4. Swap the old key for the new one.
ALTER TABLE "esg_indicator_record" ALTER COLUMN "indicator_id" SET NOT NULL;

DROP INDEX "esg_indicator_record_customer_id_indicator_reference_month_key";
ALTER TABLE "esg_indicator_record" DROP COLUMN "indicator";
DROP TYPE "esg_indicator";

-- CreateIndex
CREATE UNIQUE INDEX "esg_indicator_record_customer_indicator_month_key" ON "esg_indicator_record"("customer_id", "indicator_id", "reference_month");

-- CreateIndex
CREATE INDEX "esg_indicator_record_indicator_id_idx" ON "esg_indicator_record"("indicator_id");

-- AddForeignKey
ALTER TABLE "esg_indicator_record" ADD CONSTRAINT "esg_indicator_record_indicator_id_fkey" FOREIGN KEY ("indicator_id") REFERENCES "esg_metric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

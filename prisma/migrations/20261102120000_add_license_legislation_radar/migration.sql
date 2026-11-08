-- Reshapes the legislation catalog for the per-license radar WITHOUT losing
-- data: every existing legislation row is converted in place, alerts keep
-- pointing at their legislation, and each license's old single
-- `legislation_id` becomes a license_legislation link.

-- CreateEnum
CREATE TYPE "legislation_type" AS ENUM ('LEI', 'DECRETO', 'RESOLUCAO', 'PORTARIA', 'INSTRUCAO_NORMATIVA', 'OUTRO');

-- CreateEnum
CREATE TYPE "license_legislation_source" AS ENUM ('SCAN', 'MANUAL');

-- CreateEnum
CREATE TYPE "legislation_impact" AS ENUM ('HIGH', 'MODERATE', 'LOW');

-- Add the new columns as nullable so existing rows survive.
ALTER TABLE "legislation"
ADD COLUMN "type" "legislation_type",
ADD COLUMN "year" INTEGER,
ADD COLUMN "issuing_body" VARCHAR(150);

-- Backfill from the old columns. The type comes from the title's leading
-- words, the year from the "number/year" suffix (falling back to the
-- publication year), and the issuing body from the title or the sphere.
UPDATE "legislation" SET
  "type" = CASE
    WHEN "title" ~* '^\s*lei' THEN 'LEI'::"legislation_type"
    WHEN "title" ~* '^\s*decreto' THEN 'DECRETO'::"legislation_type"
    WHEN "title" ~* '^\s*resolu' THEN 'RESOLUCAO'::"legislation_type"
    WHEN "title" ~* '^\s*portaria' THEN 'PORTARIA'::"legislation_type"
    WHEN "title" ~* '^\s*instru' THEN 'INSTRUCAO_NORMATIVA'::"legislation_type"
    ELSE 'OUTRO'::"legislation_type"
  END,
  "year" = CASE
    WHEN "number" ~ '/[0-9]{4}\s*$' THEN substring("number" from '/([0-9]{4})\s*$')::INTEGER
    ELSE EXTRACT(YEAR FROM "publication_date")::INTEGER
  END,
  "issuing_body" = CASE
    WHEN "title" ~* 'conama' THEN 'CONAMA'
    WHEN "sphere" = 'FEDERAL' THEN 'Governo Federal'
    -- State and municipal acts reuse numbers across issuers and the old table
    -- never recorded which one, so the title stays in the issuing body to keep
    -- distinct acts apart instead of folding them into one.
    WHEN "sphere" = 'STATE' THEN left('Governo Estadual - ' || "title", 150)
    ELSE left('Governo Municipal - ' || "title", 150)
  END,
  "number" = trim(regexp_replace("number", '/[0-9]{4}\s*$', ''));

-- The old table had no unique index, so the same act may exist twice. Fold
-- duplicates into the oldest row, repointing what referenced them.
CREATE TEMP TABLE "legislation_keeper" AS
SELECT "id" AS "duplicate_id",
       first_value("id") OVER (
         PARTITION BY "type", "number", "year", "issuing_body" ORDER BY "created_at", "id"
       ) AS "keeper_id"
FROM "legislation";

UPDATE "alert" SET "legislation_id" = k."keeper_id"
FROM "legislation_keeper" k
WHERE "alert"."legislation_id" = k."duplicate_id" AND k."duplicate_id" <> k."keeper_id";

UPDATE "licenses" SET "legislation_id" = k."keeper_id"
FROM "legislation_keeper" k
WHERE "licenses"."legislation_id" = k."duplicate_id" AND k."duplicate_id" <> k."keeper_id";

DELETE FROM "legislation" l
USING "legislation_keeper" k
WHERE l."id" = k."duplicate_id" AND k."duplicate_id" <> k."keeper_id";

DROP TABLE "legislation_keeper";

ALTER TABLE "legislation"
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "year" SET NOT NULL,
ALTER COLUMN "issuing_body" SET NOT NULL;

-- CreateTable
CREATE TABLE "license_legislation" (
    "id" UUID NOT NULL,
    "source" "license_legislation_source" NOT NULL,
    "cited_excerpt" VARCHAR(4095),
    "impact" "legislation_impact",
    "technical_analysis" TEXT,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "license_id" UUID NOT NULL,
    "legislation_id" UUID NOT NULL,

    CONSTRAINT "license_legislation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "license_legislation_legislation_id_idx" ON "license_legislation"("legislation_id");

-- CreateIndex
CREATE UNIQUE INDEX "license_legislation_license_id_legislation_id_key" ON "license_legislation"("license_id", "legislation_id");

-- CreateIndex
CREATE UNIQUE INDEX "legislation_type_number_year_issuing_body_key" ON "legislation"("type", "number", "year", "issuing_body");

-- AddForeignKey
ALTER TABLE "license_legislation" ADD CONSTRAINT "license_legislation_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_legislation" ADD CONSTRAINT "license_legislation_legislation_id_fkey" FOREIGN KEY ("legislation_id") REFERENCES "legislation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A license's old single legislation becomes a manual radar entry.
INSERT INTO "license_legislation" ("id", "source", "updated_at", "license_id", "legislation_id")
SELECT gen_random_uuid(), 'MANUAL', CURRENT_TIMESTAMP, "id", "legislation_id"
FROM "licenses"
WHERE "legislation_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_legislation_id_fkey";

-- DropIndex
DROP INDEX "licenses_legislation_id_idx";

-- DropIndex
DROP INDEX "legislation_publication_date_idx";

-- AlterTable
ALTER TABLE "licenses" DROP COLUMN "legislation_id";

-- The pre-radar columns (title, sphere, publication_date, source_url, is_new)
-- are kept, now optional, so no data is lost.
ALTER TABLE "legislation"
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "sphere" DROP NOT NULL,
ALTER COLUMN "publication_date" DROP NOT NULL,
ALTER COLUMN "is_new" DROP NOT NULL,
ALTER COLUMN "is_new" DROP DEFAULT;

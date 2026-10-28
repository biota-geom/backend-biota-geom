-- CreateEnum
CREATE TYPE "government_sphere" AS ENUM ('FEDERAL', 'STATE', 'MUNICIPAL');

-- CreateEnum
CREATE TYPE "alert_type" AS ENUM ('LICENSE_EXPIRATION', 'CONDITION_DUE', 'NEW_LEGISLATION');

-- CreateEnum
CREATE TYPE "alert_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "alert_status" AS ENUM ('OPEN', 'READ', 'RESOLVED');

-- AlterTable
ALTER TABLE "esg_indicator_record" ADD COLUMN     "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" VARCHAR(255);

-- AlterTable
ALTER TABLE "licenses" ADD COLUMN     "legislation_id" UUID;

-- CreateTable
CREATE TABLE "gri_standard" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "pillar" "esg_pillar" NOT NULL,
    "description" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "gri_standard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legislation" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "number" VARCHAR(50) NOT NULL,
    "sphere" "government_sphere" NOT NULL,
    "publication_date" DATE NOT NULL,
    "summary" VARCHAR(4095),
    "source_url" VARCHAR(2048),
    "is_new" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "legislation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert" (
    "id" UUID NOT NULL,
    "type" "alert_type" NOT NULL,
    "severity" "alert_severity" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "due_date" TIMESTAMPTZ(3),
    "status" "alert_status" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "customer_id" UUID NOT NULL,
    "license_id" UUID,
    "license_condition_id" UUID,
    "legislation_id" UUID,

    CONSTRAINT "alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gri_standard_code_key" ON "gri_standard"("code");

-- CreateIndex
CREATE INDEX "legislation_publication_date_idx" ON "legislation"("publication_date" DESC);

-- CreateIndex
CREATE INDEX "alert_customer_id_status_idx" ON "alert"("customer_id", "status");

-- CreateIndex
CREATE INDEX "alert_license_id_idx" ON "alert"("license_id");

-- CreateIndex
CREATE INDEX "alert_license_condition_id_idx" ON "alert"("license_condition_id");

-- CreateIndex
CREATE INDEX "alert_legislation_id_idx" ON "alert"("legislation_id");

-- CreateIndex
CREATE INDEX "licenses_legislation_id_idx" ON "licenses"("legislation_id");

-- Until now gri_standard_id was a bare UUID with no table behind it, so any
-- value already stored points nowhere. Clear them so the FK below can be added.
UPDATE "esg_metric" SET "gri_standard_id" = NULL WHERE "gri_standard_id" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "esg_metric" ADD CONSTRAINT "esg_metric_gri_standard_id_fkey" FOREIGN KEY ("gri_standard_id") REFERENCES "gri_standard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_legislation_id_fkey" FOREIGN KEY ("legislation_id") REFERENCES "legislation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert" ADD CONSTRAINT "alert_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert" ADD CONSTRAINT "alert_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert" ADD CONSTRAINT "alert_license_condition_id_fkey" FOREIGN KEY ("license_condition_id") REFERENCES "license_condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert" ADD CONSTRAINT "alert_legislation_id_fkey" FOREIGN KEY ("legislation_id") REFERENCES "legislation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the existing ESG metric table created by the previous migration.
CREATE TYPE "esg_pillar" AS ENUM ('AMBIENTAL', 'SOCIAL', 'GOVERNANCA');

CREATE TABLE IF NOT EXISTS "esg_metric" (
    "id" UUID NOT NULL,
    "gri_standard_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "pillar" "esg_pillar" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "esg_metric_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "sectors" ALTER COLUMN "name" TYPE VARCHAR(120);

-- AlterTable
ALTER TABLE "esg_metric"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "gri_standard_id" TYPE UUID USING "gri_standard_id"::UUID,
    ALTER COLUMN "name" TYPE VARCHAR(120),
    ALTER COLUMN "unit" TYPE VARCHAR(30),
    ALTER COLUMN "pillar" TYPE "esg_pillar" USING "pillar"::TEXT::"esg_pillar",
    ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "esg_metric" ALTER COLUMN "updated_at" DROP DEFAULT;

DROP INDEX IF EXISTS "esg_metric_client_id_idx";
DROP INDEX IF EXISTS "esg_metric_gri_standard_id_idx";
ALTER TABLE "esg_metric" DROP COLUMN IF EXISTS "client_id";

-- CreateIndex
CREATE UNIQUE INDEX "sectors_name_key" ON "sectors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "esg_metric_name_key" ON "esg_metric"("name");

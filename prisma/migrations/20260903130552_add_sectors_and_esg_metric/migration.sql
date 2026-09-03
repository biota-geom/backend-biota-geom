-- CreateEnum
CREATE TYPE "esg_pillar" AS ENUM ('AMBIENTAL', 'SOCIAL', 'GOVERNANCA');

-- CreateTable
CREATE TABLE "sectors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_metric" (
    "id" UUID NOT NULL,
    "gri_standard_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "pillar" "esg_pillar" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "esg_metric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sectors_name_key" ON "sectors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "esg_metric_name_key" ON "esg_metric"("name");

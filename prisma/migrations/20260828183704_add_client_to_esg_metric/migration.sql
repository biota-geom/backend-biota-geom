-- CreateEnum
CREATE TYPE "EsgPillar" AS ENUM ('ambiental', 'social', 'governanca');

-- CreateTable
CREATE TABLE "esg_metric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "pillar" "EsgPillar" NOT NULL,
    "client_id" TEXT,
    "gri_standard_id" TEXT,

    CONSTRAINT "esg_metric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "esg_metric_client_id_idx" ON "esg_metric"("client_id");

-- CreateIndex
CREATE INDEX "esg_metric_gri_standard_id_idx" ON "esg_metric"("gri_standard_id");

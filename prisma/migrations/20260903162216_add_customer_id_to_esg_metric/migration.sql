-- AlterTable
ALTER TABLE "esg_metric" ADD COLUMN "customer_id" UUID;

-- CreateIndex
CREATE INDEX "esg_metric_customer_id_idx" ON "esg_metric"("customer_id");

-- CreateIndex
CREATE INDEX "esg_metric_gri_standard_id_idx" ON "esg_metric"("gri_standard_id");

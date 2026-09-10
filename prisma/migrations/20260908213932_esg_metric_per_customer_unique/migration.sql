-- DropIndex
DROP INDEX "esg_metric_customer_id_idx";

-- DropIndex
DROP INDEX "esg_metric_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "esg_metric_customer_id_name_key" ON "esg_metric"("customer_id", "name");

-- Unique name among global metrics (customer_id IS NULL).
CREATE UNIQUE INDEX "esg_metric_global_name_key" ON "esg_metric"("name") WHERE "customer_id" IS NULL;

-- AddForeignKey
ALTER TABLE "esg_metric" ADD CONSTRAINT "esg_metric_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "customer_esg_metrics" (
    "customer_id" UUID NOT NULL,
    "esg_metric_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_esg_metrics_pkey" PRIMARY KEY ("customer_id","esg_metric_id")
);

-- CreateIndex
CREATE INDEX "customer_esg_metrics_esg_metric_id_idx" ON "customer_esg_metrics"("esg_metric_id");

-- AddForeignKey
ALTER TABLE "customer_esg_metrics" ADD CONSTRAINT "customer_esg_metrics_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_esg_metrics" ADD CONSTRAINT "customer_esg_metrics_esg_metric_id_fkey" FOREIGN KEY ("esg_metric_id") REFERENCES "esg_metric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

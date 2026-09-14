-- CreateTable
CREATE TABLE "customer_environmental_topics" (
    "customer_id" UUID NOT NULL,
    "esg_metric_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_environmental_topics_pkey" PRIMARY KEY ("customer_id","esg_metric_id")
);

-- AddForeignKey
ALTER TABLE "customer_environmental_topics" ADD CONSTRAINT "customer_environmental_topics_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_environmental_topics" ADD CONSTRAINT "customer_environmental_topics_esg_metric_id_fkey" FOREIGN KEY ("esg_metric_id") REFERENCES "esg_metric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

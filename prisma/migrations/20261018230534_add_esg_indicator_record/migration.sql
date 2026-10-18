-- CreateEnum
CREATE TYPE "esg_indicator" AS ENUM ('WATER', 'WASTE', 'EMPLOYEES', 'ENERGY');

-- CreateTable
CREATE TABLE "esg_indicator_record" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "indicator" "esg_indicator" NOT NULL,
    "reference_month" DATE NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "esg_indicator_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "esg_indicator_record_customer_id_indicator_reference_month_key" ON "esg_indicator_record"("customer_id", "indicator", "reference_month");

-- AddForeignKey
ALTER TABLE "esg_indicator_record" ADD CONSTRAINT "esg_indicator_record_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Guard against negative values at the database level too.
ALTER TABLE "esg_indicator_record" ADD CONSTRAINT "esg_indicator_record_value_non_negative" CHECK ("value" >= 0);

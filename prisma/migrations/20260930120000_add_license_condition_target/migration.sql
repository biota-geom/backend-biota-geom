-- CreateEnum
CREATE TYPE "license_condition_target_operator" AS ENUM ('LTE', 'GTE', 'EQ', 'BETWEEN');

-- AlterTable
ALTER TABLE "license_condition" ADD COLUMN     "target_metric_id" UUID,
ADD COLUMN     "target_operator" "license_condition_target_operator",
ADD COLUMN     "target_value" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "license_condition_target_metric_id_idx" ON "license_condition"("target_metric_id");

-- AddForeignKey
ALTER TABLE "license_condition" ADD CONSTRAINT "license_condition_target_metric_id_fkey" FOREIGN KEY ("target_metric_id") REFERENCES "esg_metric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

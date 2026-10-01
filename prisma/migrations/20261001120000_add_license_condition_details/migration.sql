-- CreateEnum
CREATE TYPE "condition_type" AS ENUM ('INFORMATIVE', 'PERIODIC');

-- CreateEnum
CREATE TYPE "condition_periodicity" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "condition_status" AS ENUM ('FULFILLED', 'IN_PROGRESS', 'OVERDUE');

-- AlterTable
ALTER TABLE "license_condition" ADD COLUMN     "alert_date" TIMESTAMPTZ(3),
ADD COLUMN     "completion_date" TIMESTAMPTZ(3),
ADD COLUMN     "condition_status" "condition_status" NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "condition_type" "condition_type",
ADD COLUMN     "deadline" TIMESTAMPTZ(3),
ADD COLUMN     "is_violated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "item_number" VARCHAR(20),
ADD COLUMN     "periodicity" "condition_periodicity",
ADD COLUMN     "responsible_name" VARCHAR(255),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(4095);

-- CreateIndex
CREATE UNIQUE INDEX "license_condition_license_id_item_number_key" ON "license_condition"("license_id", "item_number");

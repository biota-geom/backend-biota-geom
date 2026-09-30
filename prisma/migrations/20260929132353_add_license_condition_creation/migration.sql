-- CreateEnum
CREATE TYPE "license_condition_status" AS ENUM ('REGULAR', 'ATTENTION', 'RISK');

-- AlterTable
ALTER TABLE "license_condition" ADD COLUMN     "responsible_agency" VARCHAR(150),
ADD COLUMN     "category" VARCHAR(120),
ADD COLUMN     "license_condition_status" "license_condition_status" NOT NULL DEFAULT 'REGULAR',
ALTER COLUMN "item_number" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "responsible_name" DROP NOT NULL,
ALTER COLUMN "condition_type" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "license_condition_due_date_idx" ON "license_condition"("due_date");

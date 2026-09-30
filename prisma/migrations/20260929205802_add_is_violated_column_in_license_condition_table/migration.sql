-- AlterTable
ALTER TABLE "license_condition" ADD COLUMN     "is_violated" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "category_id" DROP NOT NULL;

-- DropIndex
DROP INDEX "license_condition_due_date_idx";

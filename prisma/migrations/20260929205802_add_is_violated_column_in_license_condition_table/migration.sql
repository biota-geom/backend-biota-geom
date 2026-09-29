-- AlterTable
ALTER TABLE "license_condition" ADD COLUMN     "is_violated" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "category_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "license_condition" ADD COLUMN     "parent_condition_id" UUID;

-- CreateIndex
CREATE INDEX "license_condition_parent_condition_id_idx" ON "license_condition"("parent_condition_id");

-- AddForeignKey
ALTER TABLE "license_condition" ADD CONSTRAINT "license_condition_parent_condition_id_fkey" FOREIGN KEY ("parent_condition_id") REFERENCES "license_condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

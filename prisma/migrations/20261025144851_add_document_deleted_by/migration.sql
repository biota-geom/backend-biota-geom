-- AlterTable
ALTER TABLE "document" ADD COLUMN     "deleted_by" UUID;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


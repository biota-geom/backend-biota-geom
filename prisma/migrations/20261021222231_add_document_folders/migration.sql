-- AlterTable
ALTER TABLE "document" ADD COLUMN     "folder_id" UUID;

-- CreateTable
CREATE TABLE "document_folder" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" UUID NOT NULL,
    "parent_id" UUID,

    CONSTRAINT "document_folder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_folder_customer_id_parent_id_name_idx" ON "document_folder"("customer_id", "parent_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "document_folder_customer_id_parent_id_name_key" ON "document_folder"("customer_id", "parent_id", "name");

-- CreateIndex
CREATE INDEX "document_folder_id_deleted_at_document_date_created_at_idx" ON "document"("folder_id", "deleted_at", "document_date" DESC, "created_at" DESC);

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "document_folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_folder" ADD CONSTRAINT "document_folder_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_folder" ADD CONSTRAINT "document_folder_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "document_folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

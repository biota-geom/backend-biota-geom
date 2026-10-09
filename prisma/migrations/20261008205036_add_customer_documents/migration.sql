-- CreateEnum
CREATE TYPE "customer_document_type" AS ENUM ('CONTRATO', 'LAUDO', 'CERTIDAO', 'OUTROS');

-- CreateTable
CREATE TABLE "document" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" "customer_document_type" NOT NULL,
    "document_date" DATE NOT NULL,
    "file_url" VARCHAR(2048) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    "customer_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_customer_id_deleted_at_document_date_created_at_idx" ON "document"("customer_id", "deleted_at", "document_date" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "document_uploaded_by_idx" ON "document"("uploaded_by");

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

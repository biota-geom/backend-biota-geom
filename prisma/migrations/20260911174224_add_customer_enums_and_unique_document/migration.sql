-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "address_type" AS ENUM ('BILLING', 'SHIPPING');

-- AlterTable
ALTER TABLE "customer_address" DROP COLUMN "type",
ADD COLUMN     "type" "address_type" NOT NULL;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "document_type",
ADD COLUMN     "document_type" "document_type" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "customers_document_key" ON "customers"("document");


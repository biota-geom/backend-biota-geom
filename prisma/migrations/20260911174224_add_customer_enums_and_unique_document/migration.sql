-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "address_type" AS ENUM ('BILLING', 'SHIPPING');

-- AlterTable: convert customer_address.type from free text to the address_type
-- enum without requiring an already-populated table to be dropped. Legacy
-- free-text values that don't match an enum label (e.g. seed rows created
-- before this migration, such as "Matriz") fall back to BILLING, since there
-- is no reliable way to infer BILLING vs SHIPPING from that text and this
-- only ever affects pre-existing dev/seed rows.
ALTER TABLE "customer_address" ADD COLUMN "type_new" "address_type";

UPDATE "customer_address"
SET "type_new" = CASE
  WHEN "type" IN ('BILLING', 'SHIPPING') THEN "type"::"address_type"
  ELSE 'BILLING'::"address_type"
END;

ALTER TABLE "customer_address" ALTER COLUMN "type_new" SET NOT NULL;
ALTER TABLE "customer_address" DROP COLUMN "type";
ALTER TABLE "customer_address" RENAME COLUMN "type_new" TO "type";

-- AlterTable: convert customers.document_type from free text to the
-- document_type enum. Every row ever written by the seed already stores
-- 'CNPJ', which matches the enum label, but the fallback keeps the
-- conversion safe against any other legacy value.
ALTER TABLE "customers" ADD COLUMN "document_type_new" "document_type";

UPDATE "customers"
SET "document_type_new" = CASE
  WHEN "document_type" IN ('CPF', 'CNPJ') THEN "document_type"::"document_type"
  ELSE 'CNPJ'::"document_type"
END;

ALTER TABLE "customers" ALTER COLUMN "document_type_new" SET NOT NULL;
ALTER TABLE "customers" DROP COLUMN "document_type";
ALTER TABLE "customers" RENAME COLUMN "document_type_new" TO "document_type";

-- CreateIndex
CREATE UNIQUE INDEX "customers_document_key" ON "customers"("document");

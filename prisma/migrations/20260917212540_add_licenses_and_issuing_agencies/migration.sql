-- CreateEnum
CREATE TYPE "license_type" AS ENUM ('LP', 'LI', 'LO');

-- CreateEnum
CREATE TYPE "license_status" AS ENUM ('REGULAR', 'ATTENTION', 'EXPIRED');

-- CreateTable
CREATE TABLE "issuing_agencies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "acronym" VARCHAR(20),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issuing_agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" UUID NOT NULL,
    "type" "license_type" NOT NULL,
    "process_number" VARCHAR(255) NOT NULL,
    "issue_date" TIMESTAMPTZ(3) NOT NULL,
    "expiration_date" TIMESTAMPTZ(3) NOT NULL,
    "status" "license_status" NOT NULL,
    "document_url" VARCHAR(2048) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "customer_id" UUID NOT NULL,
    "issuing_agency_id" UUID NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "issuing_agencies_name_key" ON "issuing_agencies"("name");

-- CreateIndex
CREATE INDEX "licenses_customer_id_idx" ON "licenses"("customer_id");

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_issuing_agency_id_fkey" FOREIGN KEY ("issuing_agency_id") REFERENCES "issuing_agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

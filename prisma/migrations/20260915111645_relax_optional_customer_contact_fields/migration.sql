-- AlterTable
ALTER TABLE "customer_address" ALTER COLUMN "street" DROP NOT NULL,
ALTER COLUMN "number" DROP NOT NULL,
ALTER COLUMN "postal_code" DROP NOT NULL;

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "owner_phone" DROP NOT NULL;

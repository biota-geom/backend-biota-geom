-- CreateEnum
CREATE TYPE "license_condition_status" AS ENUM ('REGULAR', 'ATTENTION', 'RISK');

-- AlterTable
ALTER TABLE "license_condition" ADD COLUMN     "responsible_agency" VARCHAR(150),
ADD COLUMN     "status" "license_condition_status" NOT NULL DEFAULT 'REGULAR',
ALTER COLUMN "description" DROP NOT NULL;

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('INFORMATIVE', 'PERIODIC');

-- CreateEnum
CREATE TYPE "ConditionPeriodicity" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ConditionStatus" AS ENUM ('FULFILLED', 'IN_PROGRESS', 'OVERDUE');

-- CreateEnum
CREATE TYPE "license_condition_status" AS ENUM ('REGULAR', 'ATTENTION', 'RISK');

-- CreateTable
CREATE TABLE "license_condition_category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "license_condition_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_condition" (
    "id" UUID NOT NULL,
    "item_number" VARCHAR(20),
    "title" VARCHAR(255),
    "description" VARCHAR(4095),
    "category" VARCHAR(120),
    "responsible_agency" VARCHAR(150),
    "responsible_name" VARCHAR(255),
    "condition_type" "ConditionType",
    "periodicity" "ConditionPeriodicity",
    "deadline" TIMESTAMPTZ(3),
    "due_date" TIMESTAMPTZ(3),
    "alert_date" TIMESTAMPTZ(3),
    "completion_date" TIMESTAMPTZ(3),
    "license_condition_status" "license_condition_status" NOT NULL DEFAULT 'REGULAR',
    "status" "ConditionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "is_violated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "license_id" UUID NOT NULL,
    "category_id" UUID,

    CONSTRAINT "license_condition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "license_condition_license_id_idx" ON "license_condition"("license_id");

-- CreateIndex
CREATE INDEX "license_condition_category_id_idx" ON "license_condition"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "license_condition_license_id_item_number_key" ON "license_condition"("license_id", "item_number");

-- AddForeignKey
ALTER TABLE "license_condition" ADD CONSTRAINT "license_condition_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_condition" ADD CONSTRAINT "license_condition_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "license_condition_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "license_condition" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "category" VARCHAR(120) NOT NULL,
    "due_date" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "license_id" UUID NOT NULL,

    CONSTRAINT "license_condition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "license_condition_license_id_idx" ON "license_condition"("license_id");

-- CreateIndex
CREATE INDEX "license_condition_due_date_idx" ON "license_condition"("due_date");

-- AddForeignKey
ALTER TABLE "license_condition" ADD CONSTRAINT "license_condition_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

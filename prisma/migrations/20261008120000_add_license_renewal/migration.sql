ALTER TYPE "license_status" ADD VALUE 'ARCHIVED';

ALTER TABLE "licenses"
ADD COLUMN "previous_license_id" UUID;

ALTER TABLE "licenses"
ADD CONSTRAINT "licenses_previous_license_id_fkey"
FOREIGN KEY ("previous_license_id") REFERENCES "licenses"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "licenses_previous_license_id_idx" ON "licenses"("previous_license_id");

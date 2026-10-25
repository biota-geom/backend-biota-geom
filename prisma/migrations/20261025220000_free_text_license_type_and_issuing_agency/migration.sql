ALTER TABLE "licenses" ALTER COLUMN "type" TYPE VARCHAR(50) USING "type"::text;

ALTER TABLE "licenses" ADD COLUMN "issuing_agency" VARCHAR(150);

UPDATE "licenses"
SET "issuing_agency" = "issuing_agencies"."name"
FROM "issuing_agencies"
WHERE "issuing_agencies"."id" = "licenses"."issuing_agency_id";

ALTER TABLE "licenses" ALTER COLUMN "issuing_agency" SET NOT NULL;

ALTER TABLE "licenses" DROP CONSTRAINT "licenses_issuing_agency_id_fkey";
ALTER TABLE "licenses" DROP COLUMN "issuing_agency_id";

DROP TYPE "license_type";
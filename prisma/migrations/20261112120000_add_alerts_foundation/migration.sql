-- AlterTable
ALTER TABLE "alert" ADD COLUMN     "dedupe_key" VARCHAR(255),
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "message" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "alert_dedupe_key_key" ON "alert"("dedupe_key");

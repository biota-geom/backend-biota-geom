/*
  Warnings:

  - You are about to drop the column `category_id` on the `license_condition` table. All the data in the column will be lost.
  - You are about to drop the `license_condition_category` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "license_condition" DROP CONSTRAINT "license_condition_category_id_fkey";

-- DropIndex
DROP INDEX "license_condition_category_id_idx";

-- AlterTable
ALTER TABLE "license_condition" DROP COLUMN "category_id";

-- DropTable
DROP TABLE "license_condition_category";

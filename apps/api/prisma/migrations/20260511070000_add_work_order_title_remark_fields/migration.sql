-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN "customerTitleSnapshot" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "officialTitle" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "acceptRemark" TEXT;

-- Backfill historical data
UPDATE "WorkOrder" SET "customerTitleSnapshot" = "title", "officialTitle" = "title" WHERE "customerTitleSnapshot" IS NULL;

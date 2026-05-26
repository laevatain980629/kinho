-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN "faultTypeIdsJson" TEXT,
ADD COLUMN "faultTypeNamesSnapshot" TEXT,
ADD COLUMN "faultCause" TEXT,
ADD COLUMN "faultPhotos" TEXT,
ADD COLUMN "suggestedRepairPlan" TEXT,
ADD COLUMN "needQuote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "needParts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "needProcurement" BOOLEAN NOT NULL DEFAULT false;

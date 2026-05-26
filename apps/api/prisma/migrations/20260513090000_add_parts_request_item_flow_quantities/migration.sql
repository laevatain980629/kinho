ALTER TABLE "PartsRequestItem"
ADD COLUMN "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "receivedQuantity" INTEGER NOT NULL DEFAULT 0;

UPDATE "PartsRequestItem" pri
SET "reservedQuantity" = pri."quantity"
FROM "PartsRequest" pr
WHERE pri."partsRequestId" = pr."id"
  AND pr."status" = 'APPROVED';

UPDATE "PartsRequestItem" pri
SET "shippedQuantity" = pri."quantity",
    "receivedQuantity" = pri."quantity"
FROM "PartsRequest" pr
WHERE pri."partsRequestId" = pr."id"
  AND pr."status" = 'RECEIVED';

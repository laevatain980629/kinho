-- Add per-item details for parts returns so confirmation can update inventory
-- from real returned parts instead of hardcoded fallback values.
CREATE TABLE "PartsReturnItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partsReturnId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "partNo" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "partModel" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "qualityResult" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartsReturnItem_partsReturnId_fkey" FOREIGN KEY ("partsReturnId") REFERENCES "PartsReturn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

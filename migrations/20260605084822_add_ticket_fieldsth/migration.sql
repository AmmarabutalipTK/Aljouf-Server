-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ticket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "status" TEXT DEFAULT 'IN_PROGRESS',
    "orderNumber" TEXT,
    "shipmentNumber" TEXT,
    "customerName" TEXT,
    "phone" TEXT,
    "botPhone" TEXT,
    "title" TEXT,
    "description" TEXT,
    "operation" TEXT,
    "productType" TEXT,
    "quantity" INTEGER,
    "complaintStatus" TEXT,
    "reason" TEXT,
    "subCategory" TEXT,
    "location" TEXT,
    "missingCount" INTEGER,
    "productNames" TEXT,
    "receivedGood" BOOLEAN,
    "imageUrl" TEXT,
    "aljoufNote" TEXT,
    "customerNote" TEXT,
    "complaintSubmittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Ticket" ("aljoufNote", "botPhone", "category", "complaintStatus", "complaintSubmittedAt", "createdAt", "customerName", "customerNote", "description", "id", "imageUrl", "location", "missingCount", "operation", "orderNumber", "phone", "productNames", "productType", "quantity", "reason", "receivedGood", "shipmentNumber", "status", "subCategory", "title", "updatedAt") SELECT "aljoufNote", "botPhone", "category", "complaintStatus", "complaintSubmittedAt", "createdAt", "customerName", "customerNote", "description", "id", "imageUrl", "location", "missingCount", "operation", "orderNumber", "phone", "productNames", "productType", "quantity", "reason", "receivedGood", "shipmentNumber", "status", "subCategory", "title", "updatedAt" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

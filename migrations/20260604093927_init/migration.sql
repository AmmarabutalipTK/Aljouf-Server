-- CreateTable
CREATE TABLE "Ticket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "orderNumber" TEXT,
    "shipmentNumber" TEXT,
    "customerName" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "description" TEXT,
    "operation" TEXT,
    "productType" TEXT,
    "quantity" INTEGER,
    "reason" TEXT,
    "subCategory" TEXT,
    "location" TEXT,
    "imageUrl" TEXT,
    "botPhone" TEXT,
    "aljoufNote" TEXT,
    "customerNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

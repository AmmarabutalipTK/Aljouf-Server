-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "complaintStatusUpdatedAt" DATETIME;
ALTER TABLE "Ticket" ADD COLUMN "complaintStatusUpdatedBy" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "notes" TEXT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'STATUS_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'PRIORITY_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'DUE_DATE_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'POINTS_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'DESCRIPTION_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'ATTACHMENT_ADDED';
ALTER TYPE "ActivityType" ADD VALUE 'ATTACHMENT_REMOVED';

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

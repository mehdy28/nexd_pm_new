/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `attachments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publicId` to the `attachments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "publicId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "attachments_publicId_key" ON "attachments"("publicId");

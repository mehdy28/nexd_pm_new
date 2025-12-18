/*
  Warnings:

  - You are about to drop the column `model` on the `prompts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "prompts" DROP COLUMN "model",
ADD COLUMN     "modelProfileId" TEXT;

-- CreateTable
CREATE TABLE "model_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "enhancementInstructions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_profiles_id_key" ON "model_profiles"("id");

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_modelProfileId_fkey" FOREIGN KEY ("modelProfileId") REFERENCES "model_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

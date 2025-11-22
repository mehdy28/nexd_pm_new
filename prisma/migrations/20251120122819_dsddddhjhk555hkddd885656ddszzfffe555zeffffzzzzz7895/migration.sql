/*
  Warnings:

  - You are about to drop the column `promptId` on the `content_blocks` table. All the data in the column will be lost.
  - You are about to drop the column `promptId` on the `prompt_variables` table. All the data in the column will be lost.
  - You are about to drop the column `aiEnhancedContent` on the `prompts` table. All the data in the column will be lost.
  - You are about to drop the column `context` on the `prompts` table. All the data in the column will be lost.
  - Made the column `versionId` on table `content_blocks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `versionId` on table `prompt_variables` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."content_blocks" DROP CONSTRAINT "content_blocks_promptId_fkey";

-- DropForeignKey
ALTER TABLE "public"."prompt_variables" DROP CONSTRAINT "prompt_variables_promptId_fkey";

-- AlterTable
ALTER TABLE "content_blocks" DROP COLUMN "promptId",
ALTER COLUMN "versionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "prompt_variables" DROP COLUMN "promptId",
ALTER COLUMN "versionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "prompts" DROP COLUMN "aiEnhancedContent",
DROP COLUMN "context";

-- AlterTable
ALTER TABLE "versions" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

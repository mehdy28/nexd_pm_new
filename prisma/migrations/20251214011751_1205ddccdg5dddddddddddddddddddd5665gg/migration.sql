/*
  Warnings:

  - The values [WIREFRAME_CREATED,WIREFRAME_UPDATED,WIREFRAME_DELETED] on the enum `ActivityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `wireframeId` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the column `wireframeId` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `wireframeId` on the `prompts` table. All the data in the column will be lost.
  - You are about to drop the `wireframes` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('TASK_CREATED', 'TASK_UPDATED', 'TASK_COMPLETED', 'TASK_ASSIGNED', 'TASK_DELETED', 'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED', 'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'WHITEBOARD_CREATED', 'WHITEBOARD_UPDATED', 'WHITEBOARD_DELETED', 'PROMPT_CREATED', 'PROMPT_UPDATED', 'PROMPT_DELETED', 'COMMENT_ADDED', 'COMMENT_UPDATED', 'COMMENT_DELETED', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'MEMBER_UPDATED', 'STATUS_UPDATED', 'PRIORITY_UPDATED', 'DUE_DATE_UPDATED', 'POINTS_UPDATED', 'DESCRIPTION_UPDATED', 'ATTACHMENT_ADDED', 'ATTACHMENT_REMOVED');
ALTER TABLE "activities" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."activities" DROP CONSTRAINT "activities_wireframeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."comments" DROP CONSTRAINT "comments_wireframeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."prompts" DROP CONSTRAINT "prompts_wireframeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."wireframes" DROP CONSTRAINT "wireframes_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."wireframes" DROP CONSTRAINT "wireframes_userId_fkey";

-- DropIndex
DROP INDEX "public"."conversation_participants_conversationId_userId_key";

-- DropIndex
DROP INDEX "public"."labels_name_workspaceId_key";

-- DropIndex
DROP INDEX "public"."mentions_commentId_userId_key";

-- DropIndex
DROP INDEX "public"."personal_sections_userId_name_key";

-- DropIndex
DROP INDEX "public"."task_dependencies_precedingTaskId_dependentTaskId_key";

-- DropIndex
DROP INDEX "public"."workspace_invitations_workspaceId_email_key";

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "wireframeId",
ADD COLUMN     "WhiteboardId" TEXT;

-- AlterTable
ALTER TABLE "comments" DROP COLUMN "wireframeId",
ADD COLUMN     "WhiteboardId" TEXT;

-- AlterTable
ALTER TABLE "prompts" DROP COLUMN "wireframeId",
ADD COLUMN     "WhiteboardId" TEXT;

-- DropTable
DROP TABLE "public"."wireframes";

-- CreateTable
CREATE TABLE "Whiteboards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Whiteboards_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Whiteboards" ADD CONSTRAINT "Whiteboards_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Whiteboards" ADD CONSTRAINT "Whiteboards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_WhiteboardId_fkey" FOREIGN KEY ("WhiteboardId") REFERENCES "Whiteboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_WhiteboardId_fkey" FOREIGN KEY ("WhiteboardId") REFERENCES "Whiteboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_WhiteboardId_fkey" FOREIGN KEY ("WhiteboardId") REFERENCES "Whiteboards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

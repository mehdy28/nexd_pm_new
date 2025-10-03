/*
  Warnings:

  - The values [IN_PROGRESS,IN_REVIEW,CANCELLED] on the enum `TaskStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."TaskStatus_new" AS ENUM ('TODO', 'DONE');
ALTER TABLE "public"."tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."tasks" ALTER COLUMN "status" TYPE "public"."TaskStatus_new" USING ("status"::text::"public"."TaskStatus_new");
ALTER TYPE "public"."TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "public"."TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "public"."tasks" ALTER COLUMN "status" SET DEFAULT 'TODO';
COMMIT;

-- CreateTable
CREATE TABLE "public"."milestones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sprintId" TEXT NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."milestones" ADD CONSTRAINT "milestones_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "public"."sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

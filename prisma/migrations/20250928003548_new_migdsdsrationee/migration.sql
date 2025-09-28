/*
  Warnings:

  - You are about to drop the column `userId` on the `tasks` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_userId_fkey";

-- AlterTable
ALTER TABLE "public"."tasks" DROP COLUMN "userId",
ADD COLUMN     "personalSectionId" TEXT,
ADD COLUMN     "personalUserId" TEXT,
ADD COLUMN     "personalWorkspaceId" TEXT,
ADD COLUMN     "sectionId" TEXT,
ADD COLUMN     "sprintId" TEXT;

-- AlterTable
ALTER TABLE "public"."workspaces" ADD COLUMN     "industry" TEXT,
ADD COLUMN     "teamSize" TEXT,
ADD COLUMN     "workFields" TEXT[];

-- CreateTable
CREATE TABLE "public"."sprints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."personal_sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "personal_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sections_projectId_name_key" ON "public"."sections"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "personal_sections_userId_name_key" ON "public"."personal_sections"("userId", "name");

-- AddForeignKey
ALTER TABLE "public"."sprints" ADD CONSTRAINT "sprints_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sections" ADD CONSTRAINT "sections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personal_sections" ADD CONSTRAINT "personal_sections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "public"."sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_personalUserId_fkey" FOREIGN KEY ("personalUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_personalWorkspaceId_fkey" FOREIGN KEY ("personalWorkspaceId") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_personalSectionId_fkey" FOREIGN KEY ("personalSectionId") REFERENCES "public"."personal_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

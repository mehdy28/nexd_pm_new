-- CreateEnum
CREATE TYPE "public"."SprintStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."sprints" ADD COLUMN     "status" "public"."SprintStatus" NOT NULL DEFAULT 'PLANNING';

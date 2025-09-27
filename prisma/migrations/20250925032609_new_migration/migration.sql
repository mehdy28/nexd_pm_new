/*
  Warnings:

  - The values [URGENT] on the enum `Priority` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `type` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `privacy` on the `projects` table. All the data in the column will be lost.
  - The `status` column on the `projects` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `defaultProjectPrivacy` on the `workspace_settings` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Priority_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
ALTER TABLE "public"."tasks" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "public"."tasks" ALTER COLUMN "priority" TYPE "public"."Priority_new" USING ("priority"::text::"public"."Priority_new");
ALTER TYPE "public"."Priority" RENAME TO "Priority_old";
ALTER TYPE "public"."Priority_new" RENAME TO "Priority";
DROP TYPE "public"."Priority_old";
ALTER TABLE "public"."tasks" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
COMMIT;

-- AlterEnum
ALTER TYPE "public"."ProjectRole" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "public"."documents" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "public"."projects" DROP COLUMN "privacy",
DROP COLUMN "status",
ADD COLUMN     "status" "public"."ProjectStatus" NOT NULL DEFAULT 'PLANNING';

-- AlterTable
ALTER TABLE "public"."workspace_settings" DROP COLUMN "defaultProjectPrivacy";

-- DropEnum
DROP TYPE "public"."DocumentType";

-- DropEnum
DROP TYPE "public"."Privacy";

-- DropEnum
DROP TYPE "public"."Status";

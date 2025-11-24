-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarColor" TEXT;

-- AlterTable
ALTER TABLE "versions" ALTER COLUMN "isActive" SET DEFAULT true;

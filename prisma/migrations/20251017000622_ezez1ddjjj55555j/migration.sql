-- AlterTable
ALTER TABLE "public"."prompts" ADD COLUMN     "context" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "model" TEXT DEFAULT 'gpt-4o',
ADD COLUMN     "variables" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "versions" JSONB NOT NULL DEFAULT '[]';

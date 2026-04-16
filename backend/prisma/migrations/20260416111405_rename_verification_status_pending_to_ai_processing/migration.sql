/*
  Warnings:

  - The values [pending] on the enum `VerificationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VerificationStatus_new" AS ENUM ('ai_processing', 'in_progress', 'finished');
ALTER TABLE "public"."verifications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "verifications" ALTER COLUMN "status" TYPE "VerificationStatus_new" USING ("status"::text::"VerificationStatus_new");
ALTER TYPE "VerificationStatus" RENAME TO "VerificationStatus_old";
ALTER TYPE "VerificationStatus_new" RENAME TO "VerificationStatus";
DROP TYPE "public"."VerificationStatus_old";
ALTER TABLE "verifications" ALTER COLUMN "status" SET DEFAULT 'ai_processing';
COMMIT;

-- AlterTable
ALTER TABLE "verifications" ALTER COLUMN "status" SET DEFAULT 'ai_processing';

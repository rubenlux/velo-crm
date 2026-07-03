-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Pending', 'Active', 'Inactive', 'Suspended', 'Deleted');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditLogAction" ADD VALUE 'UserProfileUpdated';
ALTER TYPE "AuditLogAction" ADD VALUE 'UserStatusChanged';

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'Active',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

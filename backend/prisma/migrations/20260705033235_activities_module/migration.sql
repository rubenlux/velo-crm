-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('Pendiente', 'EnProceso', 'Finalizada', 'Cancelada');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityCreated';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityUpdated';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityOwnerChanged';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityStatusChanged';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityCancelled';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityReactivated';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityResultRecorded';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityFollowUpScheduled';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityCommentAdded';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityCommentUpdated';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityCommentDeleted';
ALTER TYPE "AuditLogAction" ADD VALUE 'ActivityAttachmentAdded';

-- CreateTable
CREATE TABLE "activity_types" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "contactId" TEXT,
    "leadId" TEXT,
    "opportunityId" TEXT,
    "activityTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "status" "ActivityStatus" NOT NULL DEFAULT 'Pendiente',
    "statusBeforeCancel" "ActivityStatus",
    "priority" "CustomerPriority" NOT NULL DEFAULT 'medium',
    "authorUserId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "participantUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "result" TEXT,
    "finishedAt" TIMESTAMP(3),
    "originActivityId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_history" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_comments" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_attachments" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_types_organizationId_name_key" ON "activity_types"("organizationId", "name");

-- CreateIndex
CREATE INDEX "activities_organizationId_status_idx" ON "activities"("organizationId", "status");

-- CreateIndex
CREATE INDEX "activities_customerId_idx" ON "activities"("customerId");

-- CreateIndex
CREATE INDEX "activities_contactId_idx" ON "activities"("contactId");

-- CreateIndex
CREATE INDEX "activities_leadId_idx" ON "activities"("leadId");

-- CreateIndex
CREATE INDEX "activities_opportunityId_idx" ON "activities"("opportunityId");

-- CreateIndex
CREATE INDEX "activities_ownerUserId_idx" ON "activities"("ownerUserId");

-- CreateIndex
CREATE INDEX "activity_history_activityId_idx" ON "activity_history"("activityId");

-- CreateIndex
CREATE INDEX "activity_comments_activityId_idx" ON "activity_comments"("activityId");

-- CreateIndex
CREATE INDEX "activity_attachments_activityId_idx" ON "activity_attachments"("activityId");

-- AddForeignKey
ALTER TABLE "activity_types" ADD CONSTRAINT "activity_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_originActivityId_fkey" FOREIGN KEY ("originActivityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_history" ADD CONSTRAINT "activity_history_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_comments" ADD CONSTRAINT "activity_comments_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attachments" ADD CONSTRAINT "activity_attachments_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint (research.md #1): toda Activity debe asociarse a al menos una de
-- {Customer, Contact, Lead, Opportunity} (RN-004) — Prisma no puede expresar un CHECK
-- multi-columna en schema.prisma, agregado a mano.
ALTER TABLE "activities" ADD CONSTRAINT "activities_at_least_one_relation"
  CHECK ("customerId" IS NOT NULL OR "contactId" IS NOT NULL OR "leadId" IS NOT NULL OR "opportunityId" IS NOT NULL);

-- CreateIndex (research.md #15): búsqueda por título <300ms a escala (SC-002/SC-003),
-- mismo patrón pg_trgm/GIN que specs 008-011.
CREATE INDEX "activities_title_trgm_idx" ON "activities" USING GIN ("title" gin_trgm_ops);

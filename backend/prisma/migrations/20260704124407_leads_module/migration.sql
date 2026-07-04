-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('Nuevo', 'Contactado', 'Calificado', 'EnNegociacion', 'Convertido', 'Perdido', 'Archivado');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('SitioWeb', 'Formulario', 'RedesSociales', 'Referido', 'Llamada', 'Email', 'Importacion', 'Evento', 'CargaManual', 'Api');

-- CreateEnum
CREATE TYPE "OpportunityState" AS ENUM ('Abierta', 'Ganada', 'Perdida', 'Cancelada', 'Archivada');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('Nueva', 'Calificada', 'Descubrimiento', 'Propuesta', 'Negociacion', 'Cierre', 'Ganada', 'Perdida');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditLogAction" ADD VALUE 'LeadCreated';
ALTER TYPE "AuditLogAction" ADD VALUE 'LeadUpdated';
ALTER TYPE "AuditLogAction" ADD VALUE 'LeadOwnerChanged';
ALTER TYPE "AuditLogAction" ADD VALUE 'LeadStatusChanged';
ALTER TYPE "AuditLogAction" ADD VALUE 'LeadConverted';
ALTER TYPE "AuditLogAction" ADD VALUE 'LeadLost';
ALTER TYPE "AuditLogAction" ADD VALUE 'LeadReactivated';

-- NOTE: Prisma's migration diff proposed DROPping the hand-added pg_trgm/GIN indexes
-- from specs 008/009 (contacts_*_trgm_idx, contacts_*_gin_idx, customers_*_trgm_idx,
-- customers_tags_gin_idx) here, because they aren't represented as @@index in
-- schema.prisma (they were added by hand in their own migration.sql files, same as
-- this migration's own indexes below). Removed deliberately — those indexes must not
-- be dropped, see specs/008-customers/research.md #9 and specs/009-contacts/research.md #8.

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "jobTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "address" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'CargaManual',
    "campaign" TEXT,
    "interest" TEXT,
    "ownerUserId" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'Nuevo',
    "statusBeforeLost" "LeadStatus",
    "priority" "CustomerPriority" NOT NULL DEFAULT 'medium',
    "score" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastContactedAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "nextActionNote" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "convertedCustomerId" TEXT,
    "convertedContactId" TEXT,
    "convertedOpportunityId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_history" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_notes" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_attachments" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT,
    "leadId" TEXT,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "estimatedValue" DECIMAL(14,2),
    "state" "OpportunityState" NOT NULL DEFAULT 'Abierta',
    "stage" "PipelineStage" NOT NULL DEFAULT 'Nueva',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_organizationId_status_idx" ON "leads"("organizationId", "status");

-- Search indexes (research.md #15) — same pg_trgm/GIN pattern as specs 008/009.
CREATE INDEX "leads_name_trgm_idx" ON "leads" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "leads_company_trgm_idx" ON "leads" USING GIN ("company" gin_trgm_ops);
CREATE INDEX "leads_email_trgm_idx" ON "leads" USING GIN ("email" gin_trgm_ops);
CREATE INDEX "leads_city_trgm_idx" ON "leads" USING GIN ("city" gin_trgm_ops);
CREATE INDEX "leads_tags_gin_idx" ON "leads" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "lead_history_leadId_idx" ON "lead_history"("leadId");

-- CreateIndex
CREATE INDEX "lead_notes_leadId_idx" ON "lead_notes"("leadId");

-- CreateIndex
CREATE INDEX "lead_attachments_leadId_idx" ON "lead_attachments"("leadId");

-- CreateIndex
CREATE INDEX "opportunities_organizationId_state_idx" ON "opportunities"("organizationId", "state");

-- CreateIndex
CREATE INDEX "opportunities_customerId_idx" ON "opportunities"("customerId");

-- CreateIndex
CREATE INDEX "opportunities_leadId_idx" ON "opportunities"("leadId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_history" ADD CONSTRAINT "lead_history_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attachments" ADD CONSTRAINT "lead_attachments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

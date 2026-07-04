-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('active', 'inactive', 'archived');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditLogAction" ADD VALUE 'ContactCreated';
ALTER TYPE "AuditLogAction" ADD VALUE 'ContactUpdated';
ALTER TYPE "AuditLogAction" ADD VALUE 'ContactCustomerChanged';
ALTER TYPE "AuditLogAction" ADD VALUE 'ContactPrimaryChanged';
ALTER TYPE "AuditLogAction" ADD VALUE 'ContactArchived';
ALTER TYPE "AuditLogAction" ADD VALUE 'ContactRestored';
ALTER TYPE "AuditLogAction" ADD VALUE 'ContactMerged';

-- Note: Prisma's diff engine wants to drop the customers_*_trgm_idx / tags_gin_idx
-- indexes here because they were added by hand in the previous migration (spec 008)
-- and aren't expressible in schema.prisma — intentionally NOT dropping them, they are
-- still required by spec 008 research.md #9 / SC-001.

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "area" TEXT,
    "decisionLevel" TEXT,
    "company" TEXT,
    "primaryEmail" TEXT,
    "secondaryEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryPhone" TEXT,
    "secondaryPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatsapp" TEXT,
    "linkedin" TEXT,
    "website" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "address" TEXT,
    "ownerUserId" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'active',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" "CustomerPriority" NOT NULL DEFAULT 'medium',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "mergedIntoContactId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_history" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_organizationId_status_idx" ON "contacts"("organizationId", "status");

-- CreateIndex
CREATE INDEX "contacts_customerId_idx" ON "contacts"("customerId");

-- CreateIndex
CREATE INDEX "contact_history_contactId_idx" ON "contact_history"("contactId");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_mergedIntoContactId_fkey" FOREIGN KEY ("mergedIntoContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_history" ADD CONSTRAINT "contact_history_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- At most one primary Contact per Customer, enforced by the database itself
-- (research.md #4) — Prisma's schema syntax cannot express a partial unique index.
CREATE UNIQUE INDEX "contacts_customer_primary_unique" ON "contacts" ("customerId") WHERE "isPrimary" = true;

-- Trigram/GIN search support for <300ms lookups at scale (research.md #8, SC-001/SC-002)
CREATE INDEX "contacts_primaryEmail_trgm_idx" ON "contacts" USING GIN ("primaryEmail" gin_trgm_ops);
CREATE INDEX "contacts_firstName_trgm_idx" ON "contacts" USING GIN ("firstName" gin_trgm_ops);
CREATE INDEX "contacts_lastName_trgm_idx" ON "contacts" USING GIN ("lastName" gin_trgm_ops);
CREATE INDEX "contacts_company_trgm_idx" ON "contacts" USING GIN ("company" gin_trgm_ops);
CREATE INDEX "contacts_secondaryEmails_gin_idx" ON "contacts" USING GIN ("secondaryEmails");
CREATE INDEX "contacts_secondaryPhones_gin_idx" ON "contacts" USING GIN ("secondaryPhones");
CREATE INDEX "contacts_tags_gin_idx" ON "contacts" USING GIN ("tags");

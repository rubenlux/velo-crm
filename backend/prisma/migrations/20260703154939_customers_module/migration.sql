-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('person', 'company');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'inactive', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "CustomerPriority" AS ENUM ('low', 'medium', 'high');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditLogAction" ADD VALUE 'CustomerCreated';
ALTER TYPE "AuditLogAction" ADD VALUE 'CustomerUpdated';
ALTER TYPE "AuditLogAction" ADD VALUE 'CustomerArchived';
ALTER TYPE "AuditLogAction" ADD VALUE 'CustomerRestored';
ALTER TYPE "AuditLogAction" ADD VALUE 'CustomerMerged';
ALTER TYPE "AuditLogAction" ADD VALUE 'CustomersExported';
ALTER TYPE "AuditLogAction" ADD VALUE 'CustomersImported';

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "tradeName" TEXT,
    "type" "CustomerType" NOT NULL DEFAULT 'company',
    "taxId" TEXT,
    "taxCondition" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "address" TEXT,
    "ownerUserId" TEXT,
    "source" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" "CustomerPriority" NOT NULL DEFAULT 'medium',
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "status" "CustomerStatus" NOT NULL DEFAULT 'active',
    "mergedIntoCustomerId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_history" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_organizationId_status_idx" ON "customers"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organizationId_taxId_key" ON "customers"("organizationId", "taxId");

-- CreateIndex
CREATE INDEX "customer_history_customerId_idx" ON "customer_history"("customerId");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_mergedIntoCustomerId_fkey" FOREIGN KEY ("mergedIntoCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_history" ADD CONSTRAINT "customer_history_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigram search support for <300ms lookups at scale (research.md #9, SC-001/SC-002)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "customers_name_trgm_idx" ON "customers" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "customers_legalName_trgm_idx" ON "customers" USING GIN ("legalName" gin_trgm_ops);
CREATE INDEX "customers_email_trgm_idx" ON "customers" USING GIN ("email" gin_trgm_ops);
CREATE INDEX "customers_tags_gin_idx" ON "customers" USING GIN ("tags");

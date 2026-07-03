-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditLogAction" ADD VALUE 'RoleCreated';
ALTER TYPE "AuditLogAction" ADD VALUE 'RoleUpdated';
ALTER TYPE "AuditLogAction" ADD VALUE 'RoleDeleted';
ALTER TYPE "AuditLogAction" ADD VALUE 'RoleAssigned';
ALTER TYPE "AuditLogAction" ADD VALUE 'RoleRevoked';
ALTER TYPE "AuditLogAction" ADD VALUE 'PermissionGranted';
ALTER TYPE "AuditLogAction" ADD VALUE 'PermissionRevoked';
ALTER TYPE "AuditLogAction" ADD VALUE 'PermissionDenied';

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "inheritsFromRoleId" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignments" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_permissions" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roles_organizationId_idx" ON "roles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organizationId_name_key" ON "roles"("organizationId", "name");

-- CreateIndex
CREATE INDEX "role_assignments_membershipId_idx" ON "role_assignments"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_membershipId_roleId_key" ON "role_assignments"("membershipId", "roleId");

-- CreateIndex
CREATE INDEX "membership_permissions_membershipId_idx" ON "membership_permissions"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_permissions_membershipId_permission_key" ON "membership_permissions"("membershipId", "permission");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_inheritsFromRoleId_fkey" FOREIGN KEY ("inheritsFromRoleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

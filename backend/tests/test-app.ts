import { HttpAdapterHost } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { IdentityExceptionsFilter } from '../src/modules/identity/api/identity-exceptions.filter';
import { OrganizationsExceptionsFilter } from '../src/modules/organizations/api/organizations-exceptions.filter';
import { UsersExceptionsFilter } from '../src/modules/users/api/users-exceptions.filter';
import { RolesExceptionsFilter } from '../src/modules/roles/api/roles-exceptions.filter';
import { DefaultRolesSeeder } from '../src/modules/roles/infrastructure/default-roles.seeder';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalFilters(
    new IdentityExceptionsFilter(app.get(HttpAdapterHost)),
    new OrganizationsExceptionsFilter(app.get(HttpAdapterHost)),
    new UsersExceptionsFilter(app.get(HttpAdapterHost)),
    new RolesExceptionsFilter(app.get(HttpAdapterHost)),
  );
  await app.init();
  // Belt-and-suspenders alongside DefaultRolesSeeder's OnModuleInit hook (already
  // triggered by app.init() above) — see specs/007-roles-permissions/tasks.md T009.
  await moduleRef.get(DefaultRolesSeeder).seed();

  const prisma = moduleRef.get(PrismaService);
  return { app, prisma };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.roleAssignment.deleteMany();
  await prisma.membershipPermission.deleteMany();
  // Default Roles (organizationId = null) are shared, platform-wide rows seeded once
  // by DefaultRolesSeeder — only custom (per-Organization) roles are test-local state.
  // See specs/007-roles-permissions/research.md #2.
  await prisma.role.deleteMany({ where: { organizationId: { not: null } } });
  await prisma.organizationInvitation.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.device.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
}

import { HttpAdapterHost } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { IdentityExceptionsFilter } from '../src/modules/identity/api/identity-exceptions.filter';
import { OrganizationsExceptionsFilter } from '../src/modules/organizations/api/organizations-exceptions.filter';
import { UsersExceptionsFilter } from '../src/modules/users/api/users-exceptions.filter';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalFilters(
    new IdentityExceptionsFilter(app.get(HttpAdapterHost)),
    new OrganizationsExceptionsFilter(app.get(HttpAdapterHost)),
    new UsersExceptionsFilter(app.get(HttpAdapterHost)),
  );
  await app.init();

  const prisma = moduleRef.get(PrismaService);
  return { app, prisma };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.auditLog.deleteMany();
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

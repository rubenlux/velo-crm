import { Injectable } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'organization'>;

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: { name: string; timezone: string; currency: string; language: string },
    db: Db = this.prisma,
  ): Promise<Organization> {
    return db.organization.create({ data });
  }

  findById(organizationId: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { id: organizationId } });
  }

  findByCustomDomain(customDomain: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { customDomain } });
  }

  update(organizationId: string, data: Prisma.OrganizationUpdateInput): Promise<Organization> {
    return this.prisma.organization.update({ where: { id: organizationId }, data });
  }
}

import { Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { OrganizationRepository } from '../infrastructure/organization.repository';
import { MembershipRepository } from '../infrastructure/membership.repository';

export interface CreateOrganizationInput {
  actorUserId: string;
  name: string;
  timezone: string;
  currency: string;
  language: string;
}

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<Organization> {
    return this.prisma.$transaction(async (tx) => {
      const organization = await this.organizations.create(
        {
          name: input.name,
          timezone: input.timezone,
          currency: input.currency,
          language: input.language,
        },
        tx,
      );

      await this.memberships.create(
        { userId: input.actorUserId, organizationId: organization.id, role: 'Propietario' },
        tx,
      );

      await this.auditLog.publish(
        {
          organizationId: organization.id,
          actorUserId: input.actorUserId,
          action: 'OrganizationCreated',
          metadata: { name: organization.name },
        },
        tx,
      );

      return organization;
    });
  }
}

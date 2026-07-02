import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { MembershipRole, OrganizationInvitation } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { InvalidOrExpiredInvitationError } from '../domain/errors';

const TOKEN_TTL_HOURS = 72;

type Db = Pick<PrismaService, 'organizationInvitation'>;

export interface IssuedInvitation {
  record: OrganizationInvitation;
  plainToken: string;
}

@Injectable()
export class OrganizationInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private hash(plainToken: string): string {
    return createHash('sha256').update(plainToken).digest('hex');
  }

  findPending(organizationId: string, email: string): Promise<OrganizationInvitation | null> {
    return this.prisma.organizationInvitation.findFirst({
      where: { organizationId, email: email.toLowerCase(), status: 'pending' },
    });
  }

  findById(organizationId: string, invitationId: string): Promise<OrganizationInvitation | null> {
    // Scoped by organizationId at the query level (not just checked by the caller
    // afterwards) so a wrong org simply gets "not found" from the DB itself.
    return this.prisma.organizationInvitation.findFirst({
      where: { id: invitationId, organizationId },
    });
  }

  list(organizationId: string): Promise<OrganizationInvitation[]> {
    return this.prisma.organizationInvitation.findMany({
      where: { organizationId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  countPending(organizationId: string): Promise<number> {
    return this.prisma.organizationInvitation.count({ where: { organizationId, status: 'pending' } });
  }

  async create(data: {
    organizationId: string;
    email: string;
    role: MembershipRole;
    invitedByUserId: string;
  }): Promise<IssuedInvitation> {
    const plainToken = randomBytes(32).toString('hex');
    const record = await this.prisma.organizationInvitation.create({
      data: {
        organizationId: data.organizationId,
        email: data.email.toLowerCase(),
        role: data.role,
        invitedByUserId: data.invitedByUserId,
        tokenHash: this.hash(plainToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
      },
    });
    return { record, plainToken };
  }

  async reissue(organizationId: string, invitationId: string, role: MembershipRole): Promise<IssuedInvitation> {
    const plainToken = randomBytes(32).toString('hex');
    // updateMany (not update) because the where clause combines the PK with
    // organizationId; Prisma's single-record update only accepts unique fields.
    // A count of 0 means the invitation doesn't belong to this Organization.
    const { count } = await this.prisma.organizationInvitation.updateMany({
      where: { id: invitationId, organizationId },
      data: {
        role,
        tokenHash: this.hash(plainToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
      },
    });
    if (count === 0) {
      throw new InvalidOrExpiredInvitationError();
    }
    const record = await this.prisma.organizationInvitation.findUniqueOrThrow({ where: { id: invitationId } });
    return { record, plainToken };
  }

  async cancel(organizationId: string, invitationId: string): Promise<void> {
    const { count } = await this.prisma.organizationInvitation.updateMany({
      where: { id: invitationId, organizationId },
      data: { status: 'cancelled', resolvedAt: new Date() },
    });
    if (count === 0) {
      throw new InvalidOrExpiredInvitationError();
    }
  }

  async consume(plainToken: string, db: Db = this.prisma): Promise<OrganizationInvitation | null> {
    const record = await db.organizationInvitation.findFirst({
      where: { tokenHash: this.hash(plainToken), status: 'pending' },
    });

    if (!record) {
      return null;
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await db.organizationInvitation.update({
        where: { id: record.id },
        data: { status: 'expired', resolvedAt: new Date() },
      });
      return null;
    }

    await db.organizationInvitation.update({
      where: { id: record.id },
      data: { status: 'accepted', resolvedAt: new Date() },
    });

    return record;
  }
}

import { Injectable } from '@nestjs/common';
import { Membership, MembershipRole } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'membership'>;

@Injectable()
export class MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: { userId: string; organizationId: string; role: MembershipRole },
    db: Db = this.prisma,
  ): Promise<Membership> {
    return db.membership.create({ data });
  }

  findByUserAndOrganization(userId: string, organizationId: string): Promise<Membership | null> {
    return this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
  }

  countActive(organizationId: string): Promise<number> {
    return this.prisma.membership.count({ where: { organizationId, status: 'active' } });
  }

  countOwners(organizationId: string): Promise<number> {
    return this.prisma.membership.count({
      where: { organizationId, role: 'Propietario', status: 'active' },
    });
  }

  listActive(organizationId: string): Promise<Membership[]> {
    return this.prisma.membership.findMany({
      where: { organizationId, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
  }
}

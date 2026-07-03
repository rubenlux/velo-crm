import { Injectable } from '@nestjs/common';
import { MembershipPermission } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class MembershipPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { membershipId: string; permission: string; grantedByUserId: string }): Promise<MembershipPermission> {
    return this.prisma.membershipPermission.create({ data });
  }

  findByMembershipAndPermission(membershipId: string, permission: string): Promise<MembershipPermission | null> {
    return this.prisma.membershipPermission.findUnique({
      where: { membershipId_permission: { membershipId, permission } },
    });
  }

  listByMembership(membershipId: string): Promise<MembershipPermission[]> {
    return this.prisma.membershipPermission.findMany({ where: { membershipId } });
  }

  async revoke(membershipId: string, permission: string): Promise<void> {
    await this.prisma.membershipPermission.deleteMany({ where: { membershipId, permission } });
  }
}

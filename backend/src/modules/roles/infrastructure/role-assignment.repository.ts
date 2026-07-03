import { Injectable } from '@nestjs/common';
import { RoleAssignment } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class RoleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { membershipId: string; roleId: string; assignedByUserId: string }): Promise<RoleAssignment> {
    return this.prisma.roleAssignment.create({ data });
  }

  findByMembershipAndRole(membershipId: string, roleId: string): Promise<RoleAssignment | null> {
    return this.prisma.roleAssignment.findUnique({
      where: { membershipId_roleId: { membershipId, roleId } },
    });
  }

  listByMembership(membershipId: string): Promise<RoleAssignment[]> {
    return this.prisma.roleAssignment.findMany({ where: { membershipId } });
  }

  countByRole(roleId: string): Promise<number> {
    return this.prisma.roleAssignment.count({ where: { roleId } });
  }

  async revoke(membershipId: string, roleId: string): Promise<void> {
    await this.prisma.roleAssignment.deleteMany({ where: { membershipId, roleId } });
  }
}

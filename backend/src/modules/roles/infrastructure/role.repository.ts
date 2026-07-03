import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface CreateRoleInput {
  organizationId: string | null;
  name: string;
  isDefault: boolean;
  inheritsFromRoleId?: string | null;
  permissions: string[];
}

export interface UpdateRoleInput {
  name?: string;
  inheritsFromRoleId?: string | null;
  permissions?: string[];
}

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateRoleInput): Promise<Role> {
    return this.prisma.role.create({ data });
  }

  findById(roleId: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { id: roleId } });
  }

  // organizationId = null is not a true unique lookup at the DB level (Postgres
  // treats distinct NULLs as non-equal in a composite unique index) — this is a plain
  // query, relied upon by DefaultRolesSeeder for its own idempotency, not by a DB
  // constraint (research.md #2).
  findByName(organizationId: string | null, name: string): Promise<Role | null> {
    return this.prisma.role.findFirst({ where: { organizationId, name } });
  }

  findDefaults(): Promise<Role[]> {
    return this.prisma.role.findMany({ where: { organizationId: null }, orderBy: { name: 'asc' } });
  }

  findByOrganization(organizationId: string): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      orderBy: { name: 'asc' },
    });
  }

  update(roleId: string, data: UpdateRoleInput): Promise<Role> {
    return this.prisma.role.update({ where: { id: roleId }, data });
  }

  delete(roleId: string): Promise<Role> {
    return this.prisma.role.delete({ where: { id: roleId } });
  }
}

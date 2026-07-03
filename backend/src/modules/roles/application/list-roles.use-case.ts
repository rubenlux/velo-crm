import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RoleRepository } from '../infrastructure/role.repository';

@Injectable()
export class ListRolesUseCase {
  constructor(private readonly roles: RoleRepository) {}

  execute(organizationId: string): Promise<Role[]> {
    return this.roles.findByOrganization(organizationId);
  }
}

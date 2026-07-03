import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from '../../organizations/infrastructure/organization.repository';
import { OrganizationNotFoundError } from '../../organizations/domain/errors';
import { PermissionDefinition, permissionsByModule } from '../infrastructure/permission-catalog';

/**
 * Filters the static Permission catalog by the Organization's enabledModules
 * (spec 005), so roles can only be assigned Permissions from modules the
 * Organization's plan actually has (spec.md US4, FR-010). Never removes a Permission
 * already granted on an existing Role — this only affects what's *offered* when
 * creating/editing a Role (spec.md Assumptions).
 */
@Injectable()
export class ListAvailablePermissionsUseCase {
  constructor(private readonly organizations: OrganizationRepository) {}

  async execute(organizationId: string): Promise<PermissionDefinition[]> {
    const organization = await this.organizations.findById(organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError();
    }
    return permissionsByModule(organization.enabledModules);
  }
}

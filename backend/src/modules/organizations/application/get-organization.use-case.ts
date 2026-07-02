import { Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { OrganizationNotFoundError } from '../domain/errors';
import { OrganizationRepository } from '../infrastructure/organization.repository';

@Injectable()
export class GetOrganizationUseCase {
  constructor(private readonly organizations: OrganizationRepository) {}

  async execute(organizationId: string): Promise<Organization> {
    const organization = await this.organizations.findById(organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError();
    }
    return organization;
  }
}

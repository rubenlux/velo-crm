import { Injectable } from '@nestjs/common';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { OrganizationRepository } from '../../organizations/infrastructure/organization.repository';

export interface MyOrganization {
  id: string;
  name: string;
  plan: string;
  status: string;
  role: string;
}

@Injectable()
export class ListMyOrganizationsUseCase {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly organizations: OrganizationRepository,
  ) {}

  async execute(userId: string): Promise<MyOrganization[]> {
    const myMemberships = await this.memberships.listByUserId(userId);

    const organizations = await Promise.all(
      myMemberships.map(async (membership) => {
        const organization = await this.organizations.findById(membership.organizationId);
        return organization ? { organization, role: membership.role } : null;
      }),
    );

    return organizations
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .map(({ organization, role }) => ({
        id: organization.id,
        name: organization.name,
        plan: organization.plan,
        status: organization.status,
        role,
      }));
  }
}

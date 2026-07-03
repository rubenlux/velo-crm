import { Module } from '@nestjs/common';
import { AuditLogPublisher } from '../../shared/audit/audit-log.publisher';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationRepository } from './infrastructure/organization.repository';
import { MembershipRepository } from './infrastructure/membership.repository';
import { AuditLogRepository } from './infrastructure/audit-log.repository';
import { OrganizationInvitationRepository } from './infrastructure/organization-invitation.repository';
import { TenantContextGuard } from './api/tenant-context.guard';
import { PlatformAdminGuard } from './api/platform-admin.guard';
import { CreateOrganizationUseCase } from './application/create-organization.use-case';
import { UpdateOrganizationUseCase } from './application/update-organization.use-case';
import { GetOrganizationUseCase } from './application/get-organization.use-case';
import { ListAuditLogUseCase } from './application/list-audit-log.use-case';
import { UpdateBrandingUseCase } from './application/update-branding.use-case';
import { UpdateTaxSettingsUseCase } from './application/update-tax-settings.use-case';
import { UpdateModulesUseCase } from './application/update-modules.use-case';
import { InviteMemberUseCase } from './application/invite-member.use-case';
import { CancelInvitationUseCase } from './application/cancel-invitation.use-case';
import { ListInvitationsUseCase } from './application/list-invitations.use-case';
import { ListMembersUseCase } from './application/list-members.use-case';
import { AcceptInvitationUseCase } from './application/accept-invitation.use-case';
import { ChangePlanUseCase } from './application/change-plan.use-case';
import { SuspendOrganizationUseCase } from './application/suspend-organization.use-case';
import { ReactivateOrganizationUseCase } from './application/reactivate-organization.use-case';
import { OrganizationsController } from './api/organizations.controller';
import { InvitationAcceptController } from './api/invitation-accept.controller';

@Module({
  imports: [IdentityModule],
  controllers: [OrganizationsController, InvitationAcceptController],
  providers: [
    OrganizationRepository,
    MembershipRepository,
    AuditLogRepository,
    OrganizationInvitationRepository,
    AuditLogPublisher,
    TenantContextGuard,
    PlatformAdminGuard,
    CreateOrganizationUseCase,
    UpdateOrganizationUseCase,
    GetOrganizationUseCase,
    ListAuditLogUseCase,
    UpdateBrandingUseCase,
    UpdateTaxSettingsUseCase,
    UpdateModulesUseCase,
    InviteMemberUseCase,
    CancelInvitationUseCase,
    ListInvitationsUseCase,
    ListMembersUseCase,
    AcceptInvitationUseCase,
    ChangePlanUseCase,
    SuspendOrganizationUseCase,
    ReactivateOrganizationUseCase,
  ],
  exports: [
    OrganizationRepository,
    MembershipRepository,
    AuditLogRepository,
    AuditLogPublisher,
    TenantContextGuard,
  ],
})
export class OrganizationsModule {}

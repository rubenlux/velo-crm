import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../../identity/api/auth.guard';
import { TenantContextGuard, TenantScopedRequest } from './tenant-context.guard';
import { PlatformAdminGuard } from './platform-admin.guard';
import { CreateOrganizationUseCase } from '../application/create-organization.use-case';
import { UpdateOrganizationUseCase } from '../application/update-organization.use-case';
import { GetOrganizationUseCase } from '../application/get-organization.use-case';
import { ListAuditLogUseCase } from '../application/list-audit-log.use-case';
import { UpdateBrandingUseCase } from '../application/update-branding.use-case';
import { UpdateTaxSettingsUseCase } from '../application/update-tax-settings.use-case';
import { UpdateModulesUseCase } from '../application/update-modules.use-case';
import { InviteMemberUseCase } from '../application/invite-member.use-case';
import { CancelInvitationUseCase } from '../application/cancel-invitation.use-case';
import { ListInvitationsUseCase } from '../application/list-invitations.use-case';
import { ListMembersUseCase } from '../application/list-members.use-case';
import { ChangePlanUseCase } from '../application/change-plan.use-case';
import { SuspendOrganizationUseCase } from '../application/suspend-organization.use-case';
import { ReactivateOrganizationUseCase } from '../application/reactivate-organization.use-case';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateTaxSettingsDto } from './dto/update-tax-settings.dto';
import { UpdateModulesDto } from './dto/update-modules.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ChangePlanDto } from './dto/change-plan.dto';

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
    private readonly getOrganizationUseCase: GetOrganizationUseCase,
    private readonly listAuditLogUseCase: ListAuditLogUseCase,
    private readonly updateBrandingUseCase: UpdateBrandingUseCase,
    private readonly updateTaxSettingsUseCase: UpdateTaxSettingsUseCase,
    private readonly updateModulesUseCase: UpdateModulesUseCase,
    private readonly inviteMemberUseCase: InviteMemberUseCase,
    private readonly cancelInvitationUseCase: CancelInvitationUseCase,
    private readonly listInvitationsUseCase: ListInvitationsUseCase,
    private readonly listMembersUseCase: ListMembersUseCase,
    private readonly changePlanUseCase: ChangePlanUseCase,
    private readonly suspendOrganizationUseCase: SuspendOrganizationUseCase,
    private readonly reactivateOrganizationUseCase: ReactivateOrganizationUseCase,
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrganizationDto) {
    return this.createOrganizationUseCase.execute({ actorUserId: req.user.id, ...dto });
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.getOrganizationUseCase.execute(id);
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @Patch(':id')
  update(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.updateOrganizationUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      actorRole: req.membershipRole,
      updates: dto,
    });
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @Get(':id/audit-log')
  listAuditLog(@Param('id') id: string, @Query() query: ListAuditLogQueryDto) {
    return this.listAuditLogUseCase.execute(id, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      action: query.action,
    });
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @Patch(':id/branding')
  updateBranding(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: UpdateBrandingDto) {
    return this.updateBrandingUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      actorRole: req.membershipRole,
      ...dto,
    });
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @Patch(':id/tax-settings')
  updateTaxSettings(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: UpdateTaxSettingsDto) {
    return this.updateTaxSettingsUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      actorRole: req.membershipRole,
      taxSettings: dto.taxSettings as Prisma.InputJsonValue,
    });
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @Patch(':id/modules')
  updateModules(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: UpdateModulesDto) {
    return this.updateModulesUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      actorRole: req.membershipRole,
      enabledModules: dto.enabledModules,
    });
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @Get(':id/members')
  listMembers(@Param('id') id: string) {
    return this.listMembersUseCase.execute(id);
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @Post(':id/invitations')
  async inviteMember(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: InviteMemberDto) {
    const issued = await this.inviteMemberUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      actorRole: req.membershipRole,
      email: dto.email,
      role: dto.role,
    });

    return {
      id: issued.record.id,
      email: issued.record.email,
      role: issued.record.role,
      status: issued.record.status,
      // Exposed only until a real email delivery channel exists (same pattern as spec 004).
      invitationToken: issued.plainToken,
    };
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @Get(':id/invitations')
  listInvitations(@Param('id') id: string) {
    return this.listInvitationsUseCase.execute(id);
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/invitations/:invitationId')
  cancelInvitation(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.cancelInvitationUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      actorRole: req.membershipRole,
      invitationId,
    });
  }

  @UseGuards(AuthGuard, TenantContextGuard)
  @Patch(':id/plan')
  changePlan(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: ChangePlanDto) {
    return this.changePlanUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      actorRole: req.membershipRole,
      plan: dto.plan,
    });
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Post(':id/suspend')
  suspend(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.suspendOrganizationUseCase.execute({ organizationId: id, actorUserId: req.user.id });
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Post(':id/reactivate')
  reactivate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.reactivateOrganizationUseCase.execute({ organizationId: id, actorUserId: req.user.id });
  }
}

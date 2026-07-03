import { Injectable } from '@nestjs/common';
import { MembershipPermission } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { MembershipRepository } from '../../organizations/infrastructure/membership.repository';
import { MembershipNotFoundError } from '../../organizations/domain/errors';
import { MembershipPermissionRepository } from '../infrastructure/membership-permission.repository';
import { isKnownPermission } from '../infrastructure/permission-catalog';
import { EffectivePermissionsService } from './effective-permissions.service';
import { PrivilegeEscalationError, UnknownPermissionError } from '../domain/errors';

export interface GrantDirectPermissionInput {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
  permission: string;
}

@Injectable()
export class GrantDirectPermissionUseCase {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly membershipPermissions: MembershipPermissionRepository,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: GrantDirectPermissionInput): Promise<MembershipPermission> {
    if (!isKnownPermission(input.permission)) {
      throw new UnknownPermissionError();
    }

    const targetMembership = await this.memberships.findByUserAndOrganization(
      input.targetUserId,
      input.organizationId,
    );
    if (!targetMembership) {
      throw new MembershipNotFoundError();
    }

    const actorMembership = await this.memberships.findByUserAndOrganization(input.actorUserId, input.organizationId);
    if (!actorMembership) {
      throw new MembershipNotFoundError();
    }
    if (actorMembership.role !== 'Propietario') {
      const actorPermissions = await this.effectivePermissions.getEffectivePermissions(actorMembership);
      if (!actorPermissions.includes(input.permission)) {
        throw new PrivilegeEscalationError();
      }
    }

    const existing = await this.membershipPermissions.findByMembershipAndPermission(
      targetMembership.id,
      input.permission,
    );
    const grant =
      existing ??
      (await this.membershipPermissions.create({
        membershipId: targetMembership.id,
        permission: input.permission,
        grantedByUserId: input.actorUserId,
      }));

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'PermissionGranted',
      metadata: { targetUserId: input.targetUserId, permission: input.permission },
    });

    return grant;
  }
}

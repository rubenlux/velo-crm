import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  DuplicateDomainError,
  ForbiddenRoleActionError,
  InvalidOrExpiredInvitationError,
  LastOwnerError,
  MembershipNotFoundError,
  OrganizationNotFoundError,
  OrganizationSuspendedError,
  PlanLimitExceededError,
} from '../domain/errors';

type OrganizationsDomainError =
  | OrganizationNotFoundError
  | MembershipNotFoundError
  | OrganizationSuspendedError
  | LastOwnerError
  | DuplicateDomainError
  | PlanLimitExceededError
  | InvalidOrExpiredInvitationError
  | ForbiddenRoleActionError;

/**
 * Translates Organizations domain errors into their corresponding HTTP responses,
 * keeping the domain layer free of framework concerns (same pattern as
 * IdentityExceptionsFilter in spec 004).
 */
@Catch(
  OrganizationNotFoundError,
  MembershipNotFoundError,
  OrganizationSuspendedError,
  LastOwnerError,
  DuplicateDomainError,
  PlanLimitExceededError,
  InvalidOrExpiredInvitationError,
  ForbiddenRoleActionError,
)
export class OrganizationsExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: OrganizationsDomainError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const mapped = this.mapToHttpException(exception);
    httpAdapter.reply(ctx.getResponse(), mapped.getResponse(), mapped.getStatus());
  }

  private mapToHttpException(exception: OrganizationsDomainError) {
    if (exception instanceof OrganizationNotFoundError) {
      return new NotFoundException('organization_not_found');
    }
    if (exception instanceof MembershipNotFoundError) {
      return new NotFoundException('membership_not_found');
    }
    if (exception instanceof OrganizationSuspendedError) {
      return new ForbiddenException('organization_suspended');
    }
    if (exception instanceof LastOwnerError) {
      return new ConflictException('last_owner');
    }
    if (exception instanceof DuplicateDomainError) {
      return new ConflictException('duplicate_domain');
    }
    if (exception instanceof PlanLimitExceededError) {
      return new ConflictException('plan_limit_exceeded');
    }
    if (exception instanceof InvalidOrExpiredInvitationError) {
      return new BadRequestException('invalid_or_expired_invitation');
    }
    return new ForbiddenException('forbidden_role_action');
  }
}

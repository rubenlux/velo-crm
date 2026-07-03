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
  DefaultRoleImmutableError,
  DuplicateRoleNameError,
  InsufficientPermissionError,
  InvalidRoleInheritanceError,
  PrivilegeEscalationError,
  RoleInUseError,
  RoleNotFoundError,
  UnknownPermissionError,
} from '../domain/errors';

type RolesDomainError =
  | RoleNotFoundError
  | DefaultRoleImmutableError
  | RoleInUseError
  | PrivilegeEscalationError
  | InsufficientPermissionError
  | DuplicateRoleNameError
  | InvalidRoleInheritanceError
  | UnknownPermissionError;

/**
 * Translates roles-module domain errors into HTTP responses, same pattern as
 * OrganizationsExceptionsFilter (spec 005) and UsersExceptionsFilter (spec 006).
 */
@Catch(
  RoleNotFoundError,
  DefaultRoleImmutableError,
  RoleInUseError,
  PrivilegeEscalationError,
  InsufficientPermissionError,
  DuplicateRoleNameError,
  InvalidRoleInheritanceError,
  UnknownPermissionError,
)
export class RolesExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: RolesDomainError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const mapped = this.mapToHttpException(exception);
    httpAdapter.reply(ctx.getResponse(), mapped.getResponse(), mapped.getStatus());
  }

  private mapToHttpException(exception: RolesDomainError) {
    if (exception instanceof RoleNotFoundError) {
      return new NotFoundException('role_not_found');
    }
    if (exception instanceof DefaultRoleImmutableError) {
      return new ForbiddenException('default_role_immutable');
    }
    if (exception instanceof RoleInUseError) {
      return new ConflictException('role_in_use');
    }
    if (exception instanceof PrivilegeEscalationError) {
      return new ForbiddenException('privilege_escalation');
    }
    if (exception instanceof InsufficientPermissionError) {
      return new ForbiddenException('insufficient_permission');
    }
    if (exception instanceof DuplicateRoleNameError) {
      return new ConflictException('duplicate_role_name');
    }
    if (exception instanceof UnknownPermissionError) {
      return new BadRequestException('unknown_permission');
    }
    return new BadRequestException('invalid_role_inheritance');
  }
}

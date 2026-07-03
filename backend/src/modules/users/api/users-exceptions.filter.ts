import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  ForbiddenRoleActionError,
  InvalidStatusTransitionError,
  LastAdminError,
  UserNotFoundError,
} from '../domain/errors';

type UsersDomainError = UserNotFoundError | LastAdminError | InvalidStatusTransitionError | ForbiddenRoleActionError;

/**
 * Translates Users domain errors into their corresponding HTTP responses (same
 * pattern as IdentityExceptionsFilter/OrganizationsExceptionsFilter).
 */
@Catch(UserNotFoundError, LastAdminError, InvalidStatusTransitionError, ForbiddenRoleActionError)
export class UsersExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: UsersDomainError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const mapped = this.mapToHttpException(exception);
    httpAdapter.reply(ctx.getResponse(), mapped.getResponse(), mapped.getStatus());
  }

  private mapToHttpException(exception: UsersDomainError) {
    if (exception instanceof UserNotFoundError) {
      return new NotFoundException('user_not_found');
    }
    if (exception instanceof LastAdminError) {
      return new ConflictException('last_admin');
    }
    if (exception instanceof InvalidStatusTransitionError) {
      return new ConflictException('invalid_status_transition');
    }
    return new ForbiddenException('forbidden_role_action');
  }
}

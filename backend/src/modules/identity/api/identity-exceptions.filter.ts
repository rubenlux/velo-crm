import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidOrExpiredTokenError,
  OAuthOnlyAccountError,
} from '../domain/errors';

type IdentityDomainError =
  | EmailAlreadyRegisteredError
  | InvalidCredentialsError
  | InvalidOrExpiredTokenError
  | OAuthOnlyAccountError;

/**
 * Translates Identity domain errors into their corresponding HTTP responses,
 * keeping the domain layer free of framework concerns.
 */
@Catch(EmailAlreadyRegisteredError, InvalidCredentialsError, InvalidOrExpiredTokenError, OAuthOnlyAccountError)
export class IdentityExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: IdentityDomainError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const mapped = this.mapToHttpException(exception);
    httpAdapter.reply(ctx.getResponse(), mapped.getResponse(), mapped.getStatus());
  }

  private mapToHttpException(exception: IdentityDomainError) {
    if (exception instanceof EmailAlreadyRegisteredError) {
      return new ConflictException('email_already_registered');
    }
    if (exception instanceof InvalidOrExpiredTokenError) {
      return new BadRequestException('invalid_or_expired_token');
    }
    if (exception instanceof OAuthOnlyAccountError) {
      return new ConflictException('oauth_only_account');
    }
    return new UnauthorizedException('invalid_credentials');
  }
}

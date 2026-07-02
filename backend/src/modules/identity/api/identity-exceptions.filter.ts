import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, UnauthorizedException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { EmailAlreadyRegisteredError, InvalidCredentialsError } from '../domain/errors';

/**
 * Translates Identity domain errors into their corresponding HTTP responses,
 * keeping the domain layer free of framework concerns.
 */
@Catch(EmailAlreadyRegisteredError, InvalidCredentialsError)
export class IdentityExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: EmailAlreadyRegisteredError | InvalidCredentialsError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const mapped =
      exception instanceof EmailAlreadyRegisteredError
        ? new ConflictException('email_already_registered')
        : new UnauthorizedException('invalid_credentials');

    httpAdapter.reply(ctx.getResponse(), mapped.getResponse(), mapped.getStatus());
  }
}

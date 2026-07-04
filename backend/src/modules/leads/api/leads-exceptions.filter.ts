import { ArgumentsHost, BadRequestException, Catch, ConflictException, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  LeadAlreadyConvertedError,
  LeadConversionLinkNotFoundError,
  LeadDuplicateWarning,
  LeadNotConvertibleError,
  LeadNotFoundError,
  LeadNotLostError,
  LeadStaleUpdateError,
} from '../domain/errors';

type LeadsDomainError =
  | LeadNotFoundError
  | LeadStaleUpdateError
  | LeadAlreadyConvertedError
  | LeadNotConvertibleError
  | LeadNotLostError
  | LeadConversionLinkNotFoundError
  | LeadDuplicateWarning;

/**
 * Translates leads-module domain errors into HTTP responses, same pattern as
 * ContactsExceptionsFilter (spec 009) and the filters before it.
 */
@Catch(
  LeadNotFoundError,
  LeadStaleUpdateError,
  LeadAlreadyConvertedError,
  LeadNotConvertibleError,
  LeadNotLostError,
  LeadConversionLinkNotFoundError,
  LeadDuplicateWarning,
)
export class LeadsExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: LeadsDomainError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const mapped = this.mapToHttpException(exception);
    httpAdapter.reply(ctx.getResponse(), mapped.getResponse(), mapped.getStatus());
  }

  private mapToHttpException(exception: LeadsDomainError) {
    if (exception instanceof LeadNotFoundError) {
      return new NotFoundException('lead_not_found');
    }
    if (exception instanceof LeadStaleUpdateError) {
      return new ConflictException('lead_stale_update');
    }
    if (exception instanceof LeadAlreadyConvertedError) {
      return new ConflictException('lead_already_converted');
    }
    if (exception instanceof LeadNotConvertibleError) {
      return new ConflictException('lead_not_convertible');
    }
    if (exception instanceof LeadNotLostError) {
      return new ConflictException('lead_not_lost');
    }
    if (exception instanceof LeadConversionLinkNotFoundError) {
      return new BadRequestException('lead_conversion_link_not_found');
    }
    return new ConflictException({
      message: 'lead_duplicate_warning',
      candidateCustomerId: (exception as LeadDuplicateWarning).candidateCustomerId,
      candidateContactId: (exception as LeadDuplicateWarning).candidateContactId,
    });
  }
}

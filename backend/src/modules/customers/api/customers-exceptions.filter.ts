import { ArgumentsHost, BadRequestException, Catch, ConflictException, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  CustomerArchivedError,
  CustomerDuplicateTaxIdError,
  CustomerMergedError,
  CustomerMergeSameCustomerError,
  CustomerNotFoundError,
  CustomerStaleUpdateError,
} from '../domain/errors';

type CustomersDomainError =
  | CustomerNotFoundError
  | CustomerDuplicateTaxIdError
  | CustomerMergedError
  | CustomerStaleUpdateError
  | CustomerArchivedError
  | CustomerMergeSameCustomerError;

/**
 * Translates customers-module domain errors into HTTP responses, same pattern as
 * RolesExceptionsFilter (spec 007) and the filters before it.
 */
@Catch(
  CustomerNotFoundError,
  CustomerDuplicateTaxIdError,
  CustomerMergedError,
  CustomerStaleUpdateError,
  CustomerArchivedError,
  CustomerMergeSameCustomerError,
)
export class CustomersExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: CustomersDomainError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const mapped = this.mapToHttpException(exception);
    httpAdapter.reply(ctx.getResponse(), mapped.getResponse(), mapped.getStatus());
  }

  private mapToHttpException(exception: CustomersDomainError) {
    if (exception instanceof CustomerNotFoundError) {
      return new NotFoundException('customer_not_found');
    }
    if (exception instanceof CustomerDuplicateTaxIdError) {
      return new ConflictException('customer_duplicate_tax_id');
    }
    if (exception instanceof CustomerMergedError) {
      return new ConflictException({ message: 'customer_merged', survivorCustomerId: exception.survivorCustomerId });
    }
    if (exception instanceof CustomerStaleUpdateError) {
      return new ConflictException('customer_stale_update');
    }
    if (exception instanceof CustomerArchivedError) {
      return new ConflictException('customer_archived');
    }
    return new BadRequestException('customer_merge_same_customer');
  }
}

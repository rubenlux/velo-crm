import { ArgumentsHost, BadRequestException, Catch, ConflictException, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  ContactCustomerMismatchError,
  ContactMergedError,
  ContactMergeSameContactError,
  ContactNotFoundError,
  ContactStaleUpdateError,
  CustomerNotFoundForContactError,
} from '../domain/errors';

type ContactsDomainError =
  | ContactNotFoundError
  | CustomerNotFoundForContactError
  | ContactMergedError
  | ContactStaleUpdateError
  | ContactCustomerMismatchError
  | ContactMergeSameContactError;

/**
 * Translates contacts-module domain errors into HTTP responses, same pattern as
 * CustomersExceptionsFilter (spec 008) and the filters before it.
 */
@Catch(
  ContactNotFoundError,
  CustomerNotFoundForContactError,
  ContactMergedError,
  ContactStaleUpdateError,
  ContactCustomerMismatchError,
  ContactMergeSameContactError,
)
export class ContactsExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: ContactsDomainError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const mapped = this.mapToHttpException(exception);
    httpAdapter.reply(ctx.getResponse(), mapped.getResponse(), mapped.getStatus());
  }

  private mapToHttpException(exception: ContactsDomainError) {
    if (exception instanceof ContactNotFoundError) {
      return new NotFoundException('contact_not_found');
    }
    if (exception instanceof CustomerNotFoundForContactError) {
      return new BadRequestException('customer_not_found_for_contact');
    }
    if (exception instanceof ContactMergedError) {
      return new ConflictException({ message: 'contact_merged', survivorContactId: exception.survivorContactId });
    }
    if (exception instanceof ContactStaleUpdateError) {
      return new ConflictException('contact_stale_update');
    }
    if (exception instanceof ContactMergeSameContactError) {
      return new BadRequestException('contact_merge_same_contact');
    }
    return new BadRequestException('contact_customer_mismatch');
  }
}

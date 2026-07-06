import { ArgumentsHost, BadRequestException, Catch, ConflictException, ExceptionFilter, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  ActivityNoRelationError,
  ActivityNotCancelledError,
  ActivityNotFinishedError,
  ActivityNotFoundError,
  ActivityRelatedEntitiesMismatchError,
  ActivityStaleUpdateError,
  ActivityTypeNotFoundError,
  CommentNotFoundError,
  CommentNotOwnedError,
} from '../domain/errors';

type ActivitiesDomainError =
  | ActivityNotFoundError
  | ActivityStaleUpdateError
  | ActivityNotCancelledError
  | ActivityNotFinishedError
  | ActivityRelatedEntitiesMismatchError
  | ActivityNoRelationError
  | ActivityTypeNotFoundError
  | CommentNotFoundError
  | CommentNotOwnedError;

/**
 * Translates activities-module domain errors into HTTP responses, same pattern as
 * OpportunitiesExceptionsFilter (spec 011) and the filters before it.
 */
@Catch(
  ActivityNotFoundError,
  ActivityStaleUpdateError,
  ActivityNotCancelledError,
  ActivityNotFinishedError,
  ActivityRelatedEntitiesMismatchError,
  ActivityNoRelationError,
  ActivityTypeNotFoundError,
  CommentNotFoundError,
  CommentNotOwnedError,
)
export class ActivitiesExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: ActivitiesDomainError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const mapped = this.mapToHttpException(exception);
    httpAdapter.reply(ctx.getResponse(), mapped.getResponse(), mapped.getStatus());
  }

  private mapToHttpException(exception: ActivitiesDomainError) {
    if (exception instanceof ActivityNotFoundError || exception instanceof ActivityTypeNotFoundError) {
      return new NotFoundException(exception instanceof ActivityTypeNotFoundError ? 'activity_type_not_found' : 'activity_not_found');
    }
    if (exception instanceof ActivityStaleUpdateError) {
      return new ConflictException('activity_stale_update');
    }
    if (exception instanceof ActivityNotCancelledError) {
      return new ConflictException('activity_not_cancelled');
    }
    if (exception instanceof ActivityNotFinishedError) {
      return new ConflictException('activity_not_finished');
    }
    if (exception instanceof ActivityRelatedEntitiesMismatchError) {
      return new BadRequestException('activity_related_entities_mismatch');
    }
    if (exception instanceof ActivityNoRelationError) {
      return new BadRequestException('activity_no_relation');
    }
    if (exception instanceof CommentNotFoundError) {
      return new NotFoundException('comment_not_found');
    }
    return new ForbiddenException('comment_not_owned');
  }
}

import { ArgumentsHost, BadRequestException, Catch, ConflictException, ExceptionFilter, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  CustomerNotFoundForOpportunityError,
  OpportunityArchivedError,
  OpportunityNotArchivedError,
  OpportunityNotFoundError,
  OpportunityNotLostError,
  OpportunityStaleUpdateError,
  PipelineNotFoundError,
  RequiresEditWonPermissionError,
  StageHasOpenOpportunitiesError,
  StageNotFoundError,
} from '../domain/errors';

type OpportunitiesDomainError =
  | OpportunityNotFoundError
  | OpportunityStaleUpdateError
  | OpportunityArchivedError
  | OpportunityNotLostError
  | OpportunityNotArchivedError
  | RequiresEditWonPermissionError
  | StageNotFoundError
  | StageHasOpenOpportunitiesError
  | PipelineNotFoundError
  | CustomerNotFoundForOpportunityError;

/**
 * Translates opportunities-module domain errors into HTTP responses, same pattern as
 * LeadsExceptionsFilter (spec 010) and the filters before it.
 */
@Catch(
  OpportunityNotFoundError,
  OpportunityStaleUpdateError,
  OpportunityArchivedError,
  OpportunityNotLostError,
  OpportunityNotArchivedError,
  RequiresEditWonPermissionError,
  StageNotFoundError,
  StageHasOpenOpportunitiesError,
  PipelineNotFoundError,
  CustomerNotFoundForOpportunityError,
)
export class OpportunitiesExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: OpportunitiesDomainError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const mapped = this.mapToHttpException(exception);
    httpAdapter.reply(ctx.getResponse(), mapped.getResponse(), mapped.getStatus());
  }

  private mapToHttpException(exception: OpportunitiesDomainError) {
    if (exception instanceof CustomerNotFoundForOpportunityError) {
      return new BadRequestException('customer_not_found_for_opportunity');
    }
    if (exception instanceof OpportunityNotFoundError || exception instanceof PipelineNotFoundError) {
      return new NotFoundException(exception instanceof PipelineNotFoundError ? 'pipeline_not_found' : 'opportunity_not_found');
    }
    if (exception instanceof OpportunityStaleUpdateError) {
      return new ConflictException('opportunity_stale_update');
    }
    if (exception instanceof OpportunityArchivedError) {
      return new ConflictException('opportunity_archived');
    }
    if (exception instanceof OpportunityNotLostError) {
      return new ConflictException('opportunity_not_lost');
    }
    if (exception instanceof OpportunityNotArchivedError) {
      return new ConflictException('opportunity_not_archived');
    }
    if (exception instanceof RequiresEditWonPermissionError) {
      return new ForbiddenException('requires_edit_won_permission');
    }
    if (exception instanceof StageNotFoundError) {
      return new NotFoundException('stage_not_found');
    }
    return new ConflictException('stage_has_open_opportunities');
  }
}

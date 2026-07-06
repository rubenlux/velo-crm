import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TenantContextGuard, TenantScopedRequest } from '../../organizations/api/tenant-context.guard';
import { PermissionsGuard } from '../../roles/api/permissions.guard';
import { RequirePermission } from '../../roles/api/require-permission.decorator';
import { CreateActivityUseCase } from '../application/create-activity.use-case';
import { SearchActivitiesUseCase } from '../application/search-activities.use-case';
import { UpdateActivityUseCase } from '../application/update-activity.use-case';
import { GetActivityUseCase } from '../application/get-activity.use-case';
import { CancelActivityUseCase } from '../application/cancel-activity.use-case';
import { ReactivateActivityUseCase } from '../application/reactivate-activity.use-case';
import { ScheduleFollowUpActivityUseCase } from '../application/schedule-follow-up-activity.use-case';
import { AddActivityAttachmentUseCase } from '../application/add-activity-attachment.use-case';
import { ListActivityAttachmentsUseCase } from '../application/list-activity-attachments.use-case';
import { AddActivityCommentUseCase } from '../application/add-activity-comment.use-case';
import { ListActivityCommentsUseCase } from '../application/list-activity-comments.use-case';
import { UpdateActivityCommentUseCase } from '../application/update-activity-comment.use-case';
import { DeleteActivityCommentUseCase } from '../application/delete-activity-comment.use-case';
import { GetActivityTimelineUseCase } from '../application/get-activity-timeline.use-case';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ScheduleFollowUpActivityDto } from './dto/schedule-follow-up-activity.dto';
import { AddActivityAttachmentDto } from './dto/add-activity-attachment.dto';
import { ActivityCommentDto } from './dto/activity-comment.dto';
import { SearchActivitiesQueryDto } from './dto/search-activities-query.dto';

/**
 * Activity CRUD + ciclo de vida (spec 012-activities). TenantContextGuard a nivel
 * de clase, activity.* por método (spec 007) — reutiliza los permission keys ya
 * declarados.
 */
@UseGuards(TenantContextGuard)
@Controller('organizations')
export class ActivitiesController {
  constructor(
    private readonly createActivityUseCase: CreateActivityUseCase,
    private readonly updateActivityUseCase: UpdateActivityUseCase,
    private readonly getActivityUseCase: GetActivityUseCase,
    private readonly cancelActivityUseCase: CancelActivityUseCase,
    private readonly reactivateActivityUseCase: ReactivateActivityUseCase,
    private readonly scheduleFollowUpActivityUseCase: ScheduleFollowUpActivityUseCase,
    private readonly addActivityAttachmentUseCase: AddActivityAttachmentUseCase,
    private readonly listActivityAttachmentsUseCase: ListActivityAttachmentsUseCase,
    private readonly addActivityCommentUseCase: AddActivityCommentUseCase,
    private readonly listActivityCommentsUseCase: ListActivityCommentsUseCase,
    private readonly updateActivityCommentUseCase: UpdateActivityCommentUseCase,
    private readonly deleteActivityCommentUseCase: DeleteActivityCommentUseCase,
    private readonly searchActivitiesUseCase: SearchActivitiesUseCase,
    private readonly getActivityTimelineUseCase: GetActivityTimelineUseCase,
  ) {}

  // Ruta literal registrada antes que la dinámica :activityId (mismo gotcha ya
  // resuelto en CustomersController/OpportunitiesController, ver CLAUDE.md).
  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.read')
  @Get(':id/activities')
  search(@Param('id') id: string, @Query() query: SearchActivitiesQueryDto) {
    return this.searchActivitiesUseCase.execute(id, {
      q: query.q,
      customerId: query.customerId,
      contactId: query.contactId,
      leadId: query.leadId,
      opportunityId: query.opportunityId,
      ownerUserId: query.ownerUserId,
      activityTypeId: query.activityTypeId,
      status: query.status as never,
      priority: query.priority,
      tag: query.tag,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.create')
  @Post(':id/activities')
  create(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: CreateActivityDto) {
    return this.createActivityUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      ...dto,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.read')
  @Get(':id/activities/:activityId')
  get(@Param('id') id: string, @Param('activityId') activityId: string) {
    return this.getActivityUseCase.execute(id, activityId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.update')
  @Patch(':id/activities/:activityId')
  update(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.updateActivityUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      activityId,
      ...dto,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/activities/:activityId/cancel')
  cancel(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('activityId') activityId: string) {
    return this.cancelActivityUseCase.execute({ organizationId: id, actorUserId: req.user.id, activityId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/activities/:activityId/reactivate')
  reactivate(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('activityId') activityId: string) {
    return this.reactivateActivityUseCase.execute({ organizationId: id, actorUserId: req.user.id, activityId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.update')
  @Post(':id/activities/:activityId/schedule-follow-up')
  scheduleFollowUp(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Body() dto: ScheduleFollowUpActivityDto,
  ) {
    return this.scheduleFollowUpActivityUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      originActivityId: activityId,
      ...dto,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.read')
  @Get(':id/activities/:activityId/attachments')
  listAttachments(@Param('id') id: string, @Param('activityId') activityId: string) {
    return this.listActivityAttachmentsUseCase.execute(id, activityId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.update')
  @Post(':id/activities/:activityId/attachments')
  addAttachment(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Body() dto: AddActivityAttachmentDto,
  ) {
    return this.addActivityAttachmentUseCase.execute({ organizationId: id, actorUserId: req.user.id, activityId, ...dto });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.read')
  @Get(':id/activities/:activityId/comments')
  listComments(@Param('id') id: string, @Param('activityId') activityId: string) {
    return this.listActivityCommentsUseCase.execute(id, activityId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.update')
  @Post(':id/activities/:activityId/comments')
  addComment(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('activityId') activityId: string, @Body() dto: ActivityCommentDto) {
    return this.addActivityCommentUseCase.execute({ organizationId: id, actorUserId: req.user.id, activityId, body: dto.body });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.update')
  @Patch(':id/activities/:activityId/comments/:commentId')
  updateComment(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Param('commentId') commentId: string,
    @Body() dto: ActivityCommentDto,
  ) {
    return this.updateActivityCommentUseCase.execute({ organizationId: id, actorUserId: req.user.id, activityId, commentId, body: dto.body });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/activities/:activityId/comments/:commentId')
  async deleteComment(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Param('commentId') commentId: string,
  ) {
    await this.deleteActivityCommentUseCase.execute({ organizationId: id, actorUserId: req.user.id, activityId, commentId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.read')
  @Get(':id/activities/:activityId/timeline')
  timeline(@Param('id') id: string, @Param('activityId') activityId: string) {
    return this.getActivityTimelineUseCase.execute(id, activityId);
  }
}

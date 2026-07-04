import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TenantContextGuard, TenantScopedRequest } from '../../organizations/api/tenant-context.guard';
import { PermissionsGuard } from '../../roles/api/permissions.guard';
import { RequirePermission } from '../../roles/api/require-permission.decorator';
import { CreateLeadUseCase } from '../application/create-lead.use-case';
import { UpdateLeadUseCase } from '../application/update-lead.use-case';
import { GetLeadUseCase } from '../application/get-lead.use-case';
import { SearchLeadsUseCase } from '../application/search-leads.use-case';
import { AddLeadNoteUseCase } from '../application/add-lead-note.use-case';
import { ListLeadNotesUseCase } from '../application/list-lead-notes.use-case';
import { AddLeadAttachmentUseCase } from '../application/add-lead-attachment.use-case';
import { ListLeadAttachmentsUseCase } from '../application/list-lead-attachments.use-case';
import { ConvertLeadUseCase } from '../application/convert-lead.use-case';
import { LoseLeadUseCase } from '../application/lose-lead.use-case';
import { ReactivateLeadUseCase } from '../application/reactivate-lead.use-case';
import { ImportLeadsUseCase } from '../application/import-leads.use-case';
import { GetLeadTimelineUseCase } from '../application/get-lead-timeline.use-case';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { SearchLeadsQueryDto } from './dto/search-leads-query.dto';
import { AddLeadNoteDto } from './dto/add-lead-note.dto';
import { AddLeadAttachmentDto } from './dto/add-lead-attachment.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { ImportLeadsDto } from './dto/import-leads.dto';

/**
 * Lead CRUD + lifecycle (spec 010-leads). TenantContextGuard is applied class-wide,
 * lead.* is required per-method via PermissionsGuard, reusing the permission keys
 * spec 007 already declared for the crm module (research.md #2 — no new keys added,
 * lead.delete stays unused since this spec has no destructive operation).
 */
@UseGuards(TenantContextGuard)
@Controller('organizations')
export class LeadsController {
  constructor(
    private readonly createLeadUseCase: CreateLeadUseCase,
    private readonly updateLeadUseCase: UpdateLeadUseCase,
    private readonly getLeadUseCase: GetLeadUseCase,
    private readonly searchLeadsUseCase: SearchLeadsUseCase,
    private readonly addLeadNoteUseCase: AddLeadNoteUseCase,
    private readonly listLeadNotesUseCase: ListLeadNotesUseCase,
    private readonly addLeadAttachmentUseCase: AddLeadAttachmentUseCase,
    private readonly listLeadAttachmentsUseCase: ListLeadAttachmentsUseCase,
    private readonly convertLeadUseCase: ConvertLeadUseCase,
    private readonly loseLeadUseCase: LoseLeadUseCase,
    private readonly reactivateLeadUseCase: ReactivateLeadUseCase,
    private readonly importLeadsUseCase: ImportLeadsUseCase,
    private readonly getLeadTimelineUseCase: GetLeadTimelineUseCase,
  ) {}

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.read')
  @Get(':id/leads')
  search(@Param('id') id: string, @Query() query: SearchLeadsQueryDto) {
    return this.searchLeadsUseCase.execute(id, {
      q: query.q,
      status: query.status,
      source: query.source,
      ownerUserId: query.ownerUserId,
      tag: query.tag,
      city: query.city,
      skip: query.skip,
      take: query.take,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.create')
  @Post(':id/leads')
  create(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: CreateLeadDto) {
    return this.createLeadUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      ...dto,
      source: dto.source as never,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.create')
  @Post(':id/leads/import')
  import(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: ImportLeadsDto) {
    return this.importLeadsUseCase.execute(id, req.user.id, dto.csv);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.read')
  @Get(':id/leads/:leadId')
  get(@Param('id') id: string, @Param('leadId') leadId: string) {
    return this.getLeadUseCase.execute(id, leadId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.update')
  @Patch(':id/leads/:leadId')
  update(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('leadId') leadId: string, @Body() dto: UpdateLeadDto) {
    return this.updateLeadUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      leadId,
      ...dto,
      source: dto.source as never,
      status: dto.status as never,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.read')
  @Get(':id/leads/:leadId/notes')
  listNotes(@Param('id') id: string, @Param('leadId') leadId: string) {
    return this.listLeadNotesUseCase.execute(id, leadId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.update')
  @Post(':id/leads/:leadId/notes')
  addNote(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('leadId') leadId: string, @Body() dto: AddLeadNoteDto) {
    return this.addLeadNoteUseCase.execute({ organizationId: id, actorUserId: req.user.id, leadId, note: dto.note });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.read')
  @Get(':id/leads/:leadId/attachments')
  listAttachments(@Param('id') id: string, @Param('leadId') leadId: string) {
    return this.listLeadAttachmentsUseCase.execute(id, leadId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.update')
  @Post(':id/leads/:leadId/attachments')
  addAttachment(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('leadId') leadId: string,
    @Body() dto: AddLeadAttachmentDto,
  ) {
    return this.addLeadAttachmentUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      leadId,
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.update')
  @Post(':id/leads/:leadId/convert')
  convert(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('leadId') leadId: string, @Body() dto: ConvertLeadDto) {
    return this.convertLeadUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      leadId,
      linkToExistingCustomerId: dto.linkToExistingCustomerId,
      linkToExistingContactId: dto.linkToExistingContactId,
      forceCreateNew: dto.forceCreateNew,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/leads/:leadId/lose')
  lose(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('leadId') leadId: string) {
    return this.loseLeadUseCase.execute({ organizationId: id, actorUserId: req.user.id, leadId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/leads/:leadId/reactivate')
  reactivate(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('leadId') leadId: string) {
    return this.reactivateLeadUseCase.execute({ organizationId: id, actorUserId: req.user.id, leadId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('lead.read')
  @Get(':id/leads/:leadId/timeline')
  timeline(@Param('id') id: string, @Param('leadId') leadId: string) {
    return this.getLeadTimelineUseCase.execute(id, leadId);
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TenantContextGuard, TenantScopedRequest } from '../../organizations/api/tenant-context.guard';
import { PermissionsGuard } from '../../roles/api/permissions.guard';
import { RequirePermission } from '../../roles/api/require-permission.decorator';
import { CreateContactUseCase } from '../application/create-contact.use-case';
import { UpdateContactUseCase } from '../application/update-contact.use-case';
import { GetContactUseCase } from '../application/get-contact.use-case';
import { ArchiveContactUseCase } from '../application/archive-contact.use-case';
import { RestoreContactUseCase } from '../application/restore-contact.use-case';
import { SetPrimaryContactUseCase } from '../application/set-primary-contact.use-case';
import { SearchContactsUseCase } from '../application/search-contacts.use-case';
import { GetContactTimelineUseCase } from '../application/get-contact-timeline.use-case';
import { TransferContactUseCase } from '../application/transfer-contact.use-case';
import { MergeContactsUseCase } from '../application/merge-contacts.use-case';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { SearchContactsQueryDto } from './dto/search-contacts-query.dto';
import { TransferContactDto } from './dto/transfer-contact.dto';
import { MergeContactsDto } from './dto/merge-contacts.dto';

/**
 * Contact CRUD (spec 009-contacts, US1). TenantContextGuard is applied class-wide,
 * contact.* is required per-method via PermissionsGuard, reusing the permission keys
 * spec 007 already declared for the crm module (research.md #2 — no new keys added).
 * Creation is nested under a Customer (RN-001: every Contact belongs to exactly one),
 * everything else operates on /organizations/:id/contacts/:contactId directly.
 */
@UseGuards(TenantContextGuard)
@Controller('organizations')
export class ContactsController {
  constructor(
    private readonly createContactUseCase: CreateContactUseCase,
    private readonly updateContactUseCase: UpdateContactUseCase,
    private readonly getContactUseCase: GetContactUseCase,
    private readonly archiveContactUseCase: ArchiveContactUseCase,
    private readonly restoreContactUseCase: RestoreContactUseCase,
    private readonly setPrimaryContactUseCase: SetPrimaryContactUseCase,
    private readonly searchContactsUseCase: SearchContactsUseCase,
    private readonly getContactTimelineUseCase: GetContactTimelineUseCase,
    private readonly transferContactUseCase: TransferContactUseCase,
    private readonly mergeContactsUseCase: MergeContactsUseCase,
  ) {}

  @UseGuards(PermissionsGuard)
  @RequirePermission('contact.read')
  @Get(':id/contacts')
  search(@Param('id') id: string, @Query() query: SearchContactsQueryDto) {
    return this.searchContactsUseCase.execute(id, {
      q: query.q,
      customerId: query.customerId,
      status: query.status,
      ownerUserId: query.ownerUserId,
      tag: query.tag,
      skip: query.skip,
      take: query.take,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('contact.create')
  @Post(':id/customers/:customerId/contacts')
  create(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('customerId') customerId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.createContactUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      customerId,
      ...dto,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('contact.read')
  @Get(':id/contacts/:contactId')
  get(@Param('id') id: string, @Param('contactId') contactId: string) {
    return this.getContactUseCase.execute(id, contactId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('contact.update')
  @Patch(':id/contacts/:contactId')
  update(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.updateContactUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      contactId,
      ...dto,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('contact.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/contacts/:contactId/archive')
  archive(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('contactId') contactId: string) {
    return this.archiveContactUseCase.execute({ organizationId: id, actorUserId: req.user.id, contactId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('contact.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/contacts/:contactId/restore')
  restore(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('contactId') contactId: string) {
    return this.restoreContactUseCase.execute({ organizationId: id, actorUserId: req.user.id, contactId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('contact.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/contacts/:contactId/set-primary')
  setPrimary(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('contactId') contactId: string) {
    return this.setPrimaryContactUseCase.execute({ organizationId: id, actorUserId: req.user.id, contactId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('contact.read')
  @Get(':id/contacts/:contactId/timeline')
  timeline(@Param('id') id: string, @Param('contactId') contactId: string) {
    return this.getContactTimelineUseCase.execute(id, contactId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('contact.update')
  @Post(':id/contacts/:contactId/transfer')
  transfer(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: TransferContactDto,
  ) {
    return this.transferContactUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      contactId,
      toCustomerId: dto.toCustomerId,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('contact.delete')
  @Post(':id/contacts/merge')
  merge(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: MergeContactsDto) {
    return this.mergeContactsUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      survivorContactId: dto.survivorContactId,
      discardedContactId: dto.discardedContactId,
    });
  }
}

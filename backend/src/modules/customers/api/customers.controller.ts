import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TenantContextGuard, TenantScopedRequest } from '../../organizations/api/tenant-context.guard';
import { PermissionsGuard } from '../../roles/api/permissions.guard';
import { RequirePermission } from '../../roles/api/require-permission.decorator';
import { CreateCustomerUseCase } from '../application/create-customer.use-case';
import { UpdateCustomerUseCase } from '../application/update-customer.use-case';
import { GetCustomerUseCase } from '../application/get-customer.use-case';
import { SearchCustomersUseCase } from '../application/search-customers.use-case';
import { ArchiveCustomerUseCase } from '../application/archive-customer.use-case';
import { RestoreCustomerUseCase } from '../application/restore-customer.use-case';
import { GetCustomerTimelineUseCase } from '../application/get-customer-timeline.use-case';
import { MergeCustomersUseCase } from '../application/merge-customers.use-case';
import { ExportCustomersUseCase } from '../application/export-customers.use-case';
import { ImportCustomersUseCase } from '../application/import-customers.use-case';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { SearchCustomersQueryDto } from './dto/search-customers-query.dto';
import { MergeCustomersDto } from './dto/merge-customers.dto';
import { ImportCustomersDto } from './dto/import-customers.dto';

/**
 * Customer CRUD (spec 008-customers, US1). TenantContextGuard is applied class-wide
 * (every method is tenant-scoped, same pattern as RolesController); customer.* is
 * required per-method via PermissionsGuard, reusing the permission keys spec 007
 * already declared for the crm module (research.md #2 — no new keys added here).
 */
@UseGuards(TenantContextGuard)
@Controller('organizations')
export class CustomersController {
  constructor(
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly getCustomerUseCase: GetCustomerUseCase,
    private readonly searchCustomersUseCase: SearchCustomersUseCase,
    private readonly archiveCustomerUseCase: ArchiveCustomerUseCase,
    private readonly restoreCustomerUseCase: RestoreCustomerUseCase,
    private readonly getCustomerTimelineUseCase: GetCustomerTimelineUseCase,
    private readonly mergeCustomersUseCase: MergeCustomersUseCase,
    private readonly exportCustomersUseCase: ExportCustomersUseCase,
    private readonly importCustomersUseCase: ImportCustomersUseCase,
  ) {}

  @UseGuards(PermissionsGuard)
  @RequirePermission('customer.read')
  @Get(':id/customers')
  search(@Param('id') id: string, @Query() query: SearchCustomersQueryDto) {
    return this.searchCustomersUseCase.execute(id, {
      q: query.q,
      status: query.status,
      ownerUserId: query.ownerUserId,
      city: query.city,
      state: query.state,
      country: query.country,
      category: query.category,
      tag: query.tag,
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      skip: query.skip,
      take: query.take,
    });
  }

  // Must be registered before GET :id/customers/:customerId — otherwise "export"
  // would be swallowed by the :customerId wildcard segment.
  @UseGuards(PermissionsGuard)
  @RequirePermission('customer.read')
  @Header('Content-Type', 'text/csv')
  @Get(':id/customers/export')
  export(@Req() req: TenantScopedRequest, @Param('id') id: string, @Query() query: SearchCustomersQueryDto) {
    return this.exportCustomersUseCase.execute(id, req.user.id, {
      q: query.q,
      status: query.status,
      ownerUserId: query.ownerUserId,
      city: query.city,
      state: query.state,
      country: query.country,
      category: query.category,
      tag: query.tag,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('customer.create')
  @Post(':id/customers')
  create(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: CreateCustomerDto) {
    return this.createCustomerUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      ...dto,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('customer.delete')
  @Post(':id/customers/merge')
  merge(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: MergeCustomersDto) {
    return this.mergeCustomersUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      survivorCustomerId: dto.survivorCustomerId,
      discardedCustomerId: dto.discardedCustomerId,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('customer.create')
  @Post(':id/customers/import')
  import(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: ImportCustomersDto) {
    return this.importCustomersUseCase.execute(id, req.user.id, dto.csv);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('customer.read')
  @Get(':id/customers/:customerId')
  get(@Param('id') id: string, @Param('customerId') customerId: string) {
    return this.getCustomerUseCase.execute(id, customerId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('customer.update')
  @Patch(':id/customers/:customerId')
  update(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.updateCustomerUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      customerId,
      ...dto,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('customer.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/customers/:customerId/archive')
  archive(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('customerId') customerId: string) {
    return this.archiveCustomerUseCase.execute({ organizationId: id, actorUserId: req.user.id, customerId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('customer.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/customers/:customerId/restore')
  restore(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('customerId') customerId: string) {
    return this.restoreCustomerUseCase.execute({ organizationId: id, actorUserId: req.user.id, customerId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('customer.read')
  @Get(':id/customers/:customerId/timeline')
  timeline(@Param('id') id: string, @Param('customerId') customerId: string) {
    return this.getCustomerTimelineUseCase.execute(id, customerId);
  }
}

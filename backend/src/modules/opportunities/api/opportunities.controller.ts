import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TenantContextGuard, TenantScopedRequest } from '../../organizations/api/tenant-context.guard';
import { PermissionsGuard } from '../../roles/api/permissions.guard';
import { RequirePermission } from '../../roles/api/require-permission.decorator';
import { CreateOpportunityUseCase } from '../application/create-opportunity.use-case';
import { UpdateOpportunityUseCase } from '../application/update-opportunity.use-case';
import { GetOpportunityUseCase } from '../application/get-opportunity.use-case';
import { SearchOpportunitiesUseCase } from '../application/search-opportunities.use-case';
import { MoveOpportunityStageUseCase } from '../application/move-opportunity-stage.use-case';
import { WinOpportunityUseCase } from '../application/win-opportunity.use-case';
import { LoseOpportunityUseCase } from '../application/lose-opportunity.use-case';
import { ReopenOpportunityUseCase } from '../application/reopen-opportunity.use-case';
import { ArchiveOpportunityUseCase } from '../application/archive-opportunity.use-case';
import { RestoreOpportunityUseCase } from '../application/restore-opportunity.use-case';
import { GetOpportunityKpisUseCase } from '../application/get-opportunity-kpis.use-case';
import { GetOpportunityForecastUseCase } from '../application/get-opportunity-forecast.use-case';
import { GetOpportunityTimelineUseCase } from '../application/get-opportunity-timeline.use-case';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { MoveOpportunityStageDto } from './dto/move-opportunity-stage.dto';
import { SearchOpportunitiesQueryDto } from './dto/search-opportunities-query.dto';

/**
 * Opportunity CRUD + lifecycle (spec 011-opportunities). TenantContextGuard a nivel
 * de clase, opportunity.* por método (spec 007) — reutiliza los permission keys ya
 * declarados; editar/mover una Opportunity Ganada exige opportunity.edit_won en vez
 * del opportunity.update genérico, chequeado dentro de cada use case (RN-005,
 * research.md #6) porque la regla depende del estado actual del recurso, no de la
 * ruta en sí (mismo motivo por el que effective-permissions, spec 007, no usa un
 * único @RequirePermission fijo).
 *
 * Nota de implementación: /opportunities/kpis y /opportunities/forecast son rutas
 * literales registradas antes que /opportunities/:opportunityId (mismo gotcha ya
 * resuelto en CustomersController para /customers/export, ver CLAUDE.md).
 */
@UseGuards(TenantContextGuard)
@Controller('organizations')
export class OpportunitiesController {
  constructor(
    private readonly createOpportunityUseCase: CreateOpportunityUseCase,
    private readonly updateOpportunityUseCase: UpdateOpportunityUseCase,
    private readonly getOpportunityUseCase: GetOpportunityUseCase,
    private readonly searchOpportunitiesUseCase: SearchOpportunitiesUseCase,
    private readonly moveOpportunityStageUseCase: MoveOpportunityStageUseCase,
    private readonly winOpportunityUseCase: WinOpportunityUseCase,
    private readonly loseOpportunityUseCase: LoseOpportunityUseCase,
    private readonly reopenOpportunityUseCase: ReopenOpportunityUseCase,
    private readonly archiveOpportunityUseCase: ArchiveOpportunityUseCase,
    private readonly restoreOpportunityUseCase: RestoreOpportunityUseCase,
    private readonly getOpportunityKpisUseCase: GetOpportunityKpisUseCase,
    private readonly getOpportunityForecastUseCase: GetOpportunityForecastUseCase,
    private readonly getOpportunityTimelineUseCase: GetOpportunityTimelineUseCase,
  ) {}

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.read')
  @Get(':id/opportunities')
  search(@Param('id') id: string, @Query() query: SearchOpportunitiesQueryDto) {
    return this.searchOpportunitiesUseCase.execute(id, {
      q: query.q,
      customerId: query.customerId,
      contactId: query.contactId,
      ownerUserId: query.ownerUserId,
      stageId: query.stageId,
      state: query.state as never,
      priority: query.priority,
      tag: query.tag,
      skip: query.skip,
      take: query.take,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.read')
  @Get(':id/opportunities/kpis')
  kpis(@Param('id') id: string) {
    return this.getOpportunityKpisUseCase.execute(id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.read')
  @Get(':id/opportunities/forecast')
  forecast(@Param('id') id: string) {
    return this.getOpportunityForecastUseCase.execute(id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.create')
  @Post(':id/opportunities')
  create(@Req() req: TenantScopedRequest, @Param('id') id: string, @Body() dto: CreateOpportunityDto) {
    return this.createOpportunityUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      ...dto,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.read')
  @Get(':id/opportunities/:opportunityId')
  get(@Param('id') id: string, @Param('opportunityId') opportunityId: string) {
    return this.getOpportunityUseCase.execute(id, opportunityId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.update')
  @Patch(':id/opportunities/:opportunityId')
  update(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('opportunityId') opportunityId: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.updateOpportunityUseCase.execute({
      organizationId: id,
      actorUserId: req.user.id,
      opportunityId,
      ...dto,
    });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.update')
  @Post(':id/opportunities/:opportunityId/move-stage')
  moveStage(
    @Req() req: TenantScopedRequest,
    @Param('id') id: string,
    @Param('opportunityId') opportunityId: string,
    @Body() dto: MoveOpportunityStageDto,
  ) {
    return this.moveOpportunityStageUseCase.execute({ organizationId: id, actorUserId: req.user.id, opportunityId, stageId: dto.stageId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/opportunities/:opportunityId/win')
  win(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('opportunityId') opportunityId: string) {
    return this.winOpportunityUseCase.execute({ organizationId: id, actorUserId: req.user.id, opportunityId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/opportunities/:opportunityId/lose')
  lose(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('opportunityId') opportunityId: string) {
    return this.loseOpportunityUseCase.execute({ organizationId: id, actorUserId: req.user.id, opportunityId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/opportunities/:opportunityId/reopen')
  reopen(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('opportunityId') opportunityId: string) {
    return this.reopenOpportunityUseCase.execute({ organizationId: id, actorUserId: req.user.id, opportunityId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/opportunities/:opportunityId/archive')
  archive(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('opportunityId') opportunityId: string) {
    return this.archiveOpportunityUseCase.execute({ organizationId: id, actorUserId: req.user.id, opportunityId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.update')
  @HttpCode(HttpStatus.OK)
  @Post(':id/opportunities/:opportunityId/restore')
  restore(@Req() req: TenantScopedRequest, @Param('id') id: string, @Param('opportunityId') opportunityId: string) {
    return this.restoreOpportunityUseCase.execute({ organizationId: id, actorUserId: req.user.id, opportunityId });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.read')
  @Get(':id/opportunities/:opportunityId/timeline')
  timeline(@Param('id') id: string, @Param('opportunityId') opportunityId: string) {
    return this.getOpportunityTimelineUseCase.execute(id, opportunityId);
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TenantContextGuard } from '../../organizations/api/tenant-context.guard';
import { PermissionsGuard } from '../../roles/api/permissions.guard';
import { RequirePermission } from '../../roles/api/require-permission.decorator';
import { ListActivityTypesUseCase } from '../application/list-activity-types.use-case';
import { CreateActivityTypeUseCase } from '../application/create-activity-type.use-case';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';

/**
 * Catálogo de tipos de Activity (spec 012-activities, US1 AC2). Configurar tipos
 * custom exige `activity.manage_types` — un nivel de permiso distinto del CRUD
 * normal de Activities (research.md #4, mismo criterio que
 * `opportunity.manage_pipeline` de spec 011).
 */
@UseGuards(TenantContextGuard)
@Controller('organizations')
export class ActivityTypesController {
  constructor(
    private readonly listActivityTypesUseCase: ListActivityTypesUseCase,
    private readonly createActivityTypeUseCase: CreateActivityTypeUseCase,
  ) {}

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.read')
  @Get(':id/activity-types')
  list(@Param('id') id: string) {
    return this.listActivityTypesUseCase.execute(id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('activity.manage_types')
  @Post(':id/activity-types')
  create(@Param('id') id: string, @Body() dto: CreateActivityTypeDto) {
    return this.createActivityTypeUseCase.execute({ organizationId: id, name: dto.name });
  }
}

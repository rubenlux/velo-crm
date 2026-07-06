import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TenantContextGuard } from '../../organizations/api/tenant-context.guard';
import { PermissionsGuard } from '../../roles/api/permissions.guard';
import { RequirePermission } from '../../roles/api/require-permission.decorator';
import { ListPipelinesUseCase } from '../application/list-pipelines.use-case';
import { CreatePipelineUseCase } from '../application/create-pipeline.use-case';
import { CreatePipelineStageUseCase } from '../application/create-pipeline-stage.use-case';
import { UpdatePipelineStageUseCase } from '../application/update-pipeline-stage.use-case';
import { DeletePipelineStageUseCase } from '../application/delete-pipeline-stage.use-case';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { CreatePipelineStageDto } from './dto/create-pipeline-stage.dto';
import { UpdatePipelineStageDto } from './dto/update-pipeline-stage.dto';

/**
 * Configuración de Pipelines/etapas (spec 011-opportunities, US1 AC4). A diferencia
 * de OpportunitiesController, todo aquí exige `opportunity.manage_pipeline` — un
 * nivel de permiso distinto del CRUD normal de Oportunidades (research.md #6).
 */
@UseGuards(TenantContextGuard)
@Controller('organizations')
export class PipelinesController {
  constructor(
    private readonly listPipelinesUseCase: ListPipelinesUseCase,
    private readonly createPipelineUseCase: CreatePipelineUseCase,
    private readonly createPipelineStageUseCase: CreatePipelineStageUseCase,
    private readonly updatePipelineStageUseCase: UpdatePipelineStageUseCase,
    private readonly deletePipelineStageUseCase: DeletePipelineStageUseCase,
  ) {}

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.read')
  @Get(':id/pipelines')
  list(@Param('id') id: string) {
    return this.listPipelinesUseCase.execute(id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.manage_pipeline')
  @Post(':id/pipelines')
  create(@Param('id') id: string, @Body() dto: CreatePipelineDto) {
    return this.createPipelineUseCase.execute({ organizationId: id, name: dto.name });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.manage_pipeline')
  @Post(':id/pipelines/:pipelineId/stages')
  createStage(@Param('id') id: string, @Param('pipelineId') pipelineId: string, @Body() dto: CreatePipelineStageDto) {
    return this.createPipelineStageUseCase.execute({ organizationId: id, pipelineId, ...dto });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.manage_pipeline')
  @Patch(':id/pipelines/:pipelineId/stages/:stageId')
  updateStage(
    @Param('id') id: string,
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdatePipelineStageDto,
  ) {
    return this.updatePipelineStageUseCase.execute({ organizationId: id, pipelineId, stageId, ...dto });
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('opportunity.manage_pipeline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/pipelines/:pipelineId/stages/:stageId')
  async deleteStage(@Param('id') id: string, @Param('pipelineId') pipelineId: string, @Param('stageId') stageId: string) {
    await this.deletePipelineStageUseCase.execute({ organizationId: id, pipelineId, stageId });
  }
}

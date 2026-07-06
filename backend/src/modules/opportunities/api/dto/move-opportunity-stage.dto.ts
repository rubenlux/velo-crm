import { IsUUID } from 'class-validator';

export class MoveOpportunityStageDto {
  @IsUUID()
  stageId!: string;
}

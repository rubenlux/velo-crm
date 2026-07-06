import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const ACTIVITY_STATUSES = ['Pendiente', 'EnProceso', 'Finalizada', 'Cancelada'];

export class SearchActivitiesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsUUID()
  activityTypeId?: string;

  @IsOptional()
  @IsIn(ACTIVITY_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}

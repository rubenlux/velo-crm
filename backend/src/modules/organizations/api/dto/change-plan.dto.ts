import { OrganizationPlan } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangePlanDto {
  @IsEnum(OrganizationPlan)
  plan!: OrganizationPlan;
}

import { AuditLogAction } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class ListAuditLogQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsEnum(AuditLogAction)
  action?: AuditLogAction;
}

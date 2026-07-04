import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ConvertLeadDto {
  @IsOptional()
  @IsUUID()
  linkToExistingCustomerId?: string;

  @IsOptional()
  @IsUUID()
  linkToExistingContactId?: string;

  @IsOptional()
  @IsBoolean()
  forceCreateNew?: boolean;
}

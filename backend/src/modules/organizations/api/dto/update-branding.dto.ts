import { IsOptional, IsString } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  customDomain?: string;
}

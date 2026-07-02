import { IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  timezone!: string;

  @IsString()
  @MinLength(1)
  currency!: string;

  @IsString()
  @MinLength(1)
  language!: string;
}

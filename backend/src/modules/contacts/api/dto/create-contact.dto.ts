import { ArrayUnique, IsArray, IsEmail, IsIn, IsISO8601, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  decisionLevel?: string;

  @IsOptional()
  @IsEmail()
  primaryEmail?: string;

  @IsOptional()
  @IsArray()
  @IsEmail(undefined, { each: true })
  secondaryEmails?: string[];

  @IsOptional()
  @IsString()
  primaryPhone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryPhones?: string[];

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}

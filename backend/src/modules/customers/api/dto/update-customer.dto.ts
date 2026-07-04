import { ArrayUnique, IsArray, IsEmail, IsEnum, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { CustomerType } from '@prisma/client';

export class UpdateCustomerDto {
  // Optimistic concurrency check (research.md #8) — must match the Customer's
  // current version or the update is rejected with 409 CustomerStaleUpdateError.
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  taxCondition?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

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
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  category?: string;

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

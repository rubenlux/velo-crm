import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsISO8601,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const LEAD_SOURCES = ['SitioWeb', 'Formulario', 'RedesSociales', 'Referido', 'Llamada', 'Email', 'Importacion', 'Evento', 'CargaManual', 'Api'];
const LEAD_STATUSES = ['Nuevo', 'Contactado', 'Calificado', 'EnNegociacion', 'Convertido', 'Perdido', 'Archivado'];

export class UpdateLeadDto {
  // Optimistic concurrency check (research.md #15), same pattern as UpdateContactDto.
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

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
  @IsIn(LEAD_SOURCES)
  source?: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  interest?: string;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsISO8601()
  lastContactedAt?: string;

  @IsOptional()
  @IsISO8601()
  nextActionAt?: string;

  @IsOptional()
  @IsString()
  nextActionNote?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}

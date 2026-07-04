import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const LEAD_STATUSES = ['Nuevo', 'Contactado', 'Calificado', 'EnNegociacion', 'Convertido', 'Perdido', 'Archivado'];
const LEAD_SOURCES = ['SitioWeb', 'Formulario', 'RedesSociales', 'Referido', 'Llamada', 'Email', 'Importacion', 'Evento', 'CargaManual', 'Api'];

export class SearchLeadsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(LEAD_SOURCES)
  source?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number;
}

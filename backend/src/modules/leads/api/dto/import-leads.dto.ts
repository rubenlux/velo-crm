import { IsString, MinLength } from 'class-validator';

// CSV content as a string field, same convention as ImportCustomersDto (spec 008).
export class ImportLeadsDto {
  @IsString()
  @MinLength(1)
  csv!: string;
}

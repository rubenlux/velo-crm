import { IsString, MinLength } from 'class-validator';

// CSV content as a string field rather than a multipart file upload — the payload is
// small, always UTF-8 text, and this keeps the endpoint testable with the same plain
// JSON pattern as the rest of the API (Simplicity Wins; no multer wiring needed).
export class ImportCustomersDto {
  @IsString()
  @MinLength(1)
  csv!: string;
}

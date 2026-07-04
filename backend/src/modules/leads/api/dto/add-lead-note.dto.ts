import { IsString, MinLength } from 'class-validator';

export class AddLeadNoteDto {
  @IsString()
  @MinLength(1)
  note!: string;
}

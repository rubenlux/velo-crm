import { IsString, MinLength } from 'class-validator';

export class AddActivityAttachmentDto {
  @IsString()
  @MinLength(1)
  fileName!: string;

  @IsString()
  @MinLength(1)
  fileUrl!: string;
}

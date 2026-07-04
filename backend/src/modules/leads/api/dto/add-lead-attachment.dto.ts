import { IsString, IsUrl, MinLength } from 'class-validator';

export class AddLeadAttachmentDto {
  @IsString()
  @MinLength(1)
  fileName!: string;

  @IsUrl({ require_tld: false })
  fileUrl!: string;
}

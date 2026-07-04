import { IsUUID } from 'class-validator';

export class MergeContactsDto {
  @IsUUID()
  survivorContactId!: string;

  @IsUUID()
  discardedContactId!: string;
}

import { IsUUID } from 'class-validator';

export class TransferContactDto {
  @IsUUID()
  toCustomerId!: string;
}

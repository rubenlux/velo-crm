import { IsUUID } from 'class-validator';

export class MergeCustomersDto {
  @IsUUID()
  survivorCustomerId!: string;

  @IsUUID()
  discardedCustomerId!: string;
}

import { IsString, MinLength } from 'class-validator';

export class CreateActivityTypeDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

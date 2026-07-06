import { IsString, MinLength } from 'class-validator';

export class ActivityCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

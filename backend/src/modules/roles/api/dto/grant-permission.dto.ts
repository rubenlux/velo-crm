import { IsString, Matches } from 'class-validator';

export class GrantPermissionDto {
  @IsString()
  @Matches(/^[a-z]+\.[a-z]+$/, { message: 'permission must be in resource.action format' })
  permission!: string;
}

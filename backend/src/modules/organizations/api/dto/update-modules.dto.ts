import { IsArray, IsString } from 'class-validator';

export class UpdateModulesDto {
  @IsArray()
  @IsString({ each: true })
  enabledModules!: string[];
}

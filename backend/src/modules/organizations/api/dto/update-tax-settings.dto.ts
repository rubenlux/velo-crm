import { IsObject } from 'class-validator';

export class UpdateTaxSettingsDto {
  @IsObject()
  taxSettings!: Record<string, unknown>;
}

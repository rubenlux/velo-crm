import { IsString } from 'class-validator';

export class EnableMfaDto {
  @IsString()
  code!: string;
}

export class VerifyMfaDto {
  @IsString()
  mfaChallengeToken!: string;

  @IsString()
  code!: string;
}

export class DisableMfaDto {
  @IsString()
  currentPassword!: string;
}

import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class VerifyEmailDto {
  @IsString()
  token!: string;
}

export class ResendVerificationDto {
  @IsString()
  email!: string;
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './infrastructure/prisma.service';
import { PasswordHasher } from './infrastructure/password-hasher';
import { AccessTokenService } from './infrastructure/jwt.service';
import { RefreshTokenService } from './infrastructure/refresh-token.service';
import { DeviceResolverService } from './infrastructure/device-resolver.service';
import { UserRepository } from './infrastructure/user.repository';
import { EmailVerificationTokenRepository } from './infrastructure/email-verification-token.repository';
import { PasswordResetTokenRepository } from './infrastructure/password-reset-token.repository';
import { DeviceRepository } from './infrastructure/device.repository';
import { OAuthAccountRepository } from './infrastructure/oauth-account.repository';
import { TotpService } from './infrastructure/totp.service';
import { MfaSecretCipher } from './infrastructure/mfa-secret-cipher';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import { MicrosoftStrategy } from './infrastructure/strategies/microsoft.strategy';
import { IdentityAuditPublisher } from '../../shared/audit/identity-audit.publisher';
import { RegisterUseCase } from './application/register.use-case';
import { LoginUseCase } from './application/login.use-case';
import { LogoutUseCase } from './application/logout.use-case';
import { VerifyEmailUseCase, ResendVerificationUseCase } from './application/verify-email.use-case';
import { RequestPasswordResetUseCase } from './application/request-password-reset.use-case';
import { ConfirmPasswordResetUseCase } from './application/confirm-password-reset.use-case';
import { ChangePasswordUseCase } from './application/change-password.use-case';
import { ListSessionsUseCase } from './application/list-sessions.use-case';
import { RevokeSessionUseCase, RevokeAllSessionsUseCase } from './application/revoke-session.use-case';
import { EnrollMfaUseCase, EnableMfaUseCase } from './application/mfa-enroll.use-case';
import { MfaVerifyUseCase } from './application/mfa-verify.use-case';
import { DisableMfaUseCase } from './application/mfa-disable.use-case';
import { OAuthLoginUseCase } from './application/oauth-login.use-case';
import { AuthController } from './api/auth.controller';
import { AuthGuard } from './api/auth.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({}),
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: 10 * 60 * 1000,
        limit: 5,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    PasswordHasher,
    AccessTokenService,
    RefreshTokenService,
    DeviceResolverService,
    UserRepository,
    EmailVerificationTokenRepository,
    PasswordResetTokenRepository,
    DeviceRepository,
    OAuthAccountRepository,
    TotpService,
    MfaSecretCipher,
    GoogleStrategy,
    MicrosoftStrategy,
    IdentityAuditPublisher,
    RegisterUseCase,
    LoginUseCase,
    LogoutUseCase,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    RequestPasswordResetUseCase,
    ConfirmPasswordResetUseCase,
    ChangePasswordUseCase,
    ListSessionsUseCase,
    RevokeSessionUseCase,
    RevokeAllSessionsUseCase,
    EnrollMfaUseCase,
    EnableMfaUseCase,
    MfaVerifyUseCase,
    DisableMfaUseCase,
    OAuthLoginUseCase,
    AuthGuard,
  ],
  exports: [AuthGuard, AccessTokenService],
})
export class IdentityModule {}

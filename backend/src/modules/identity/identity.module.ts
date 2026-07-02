import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './infrastructure/prisma.service';
import { PasswordHasher } from './infrastructure/password-hasher';
import { AccessTokenService } from './infrastructure/jwt.service';
import { RefreshTokenService } from './infrastructure/refresh-token.service';
import { UserRepository } from './infrastructure/user.repository';
import { EmailVerificationTokenRepository } from './infrastructure/email-verification-token.repository';
import { IdentityAuditPublisher } from '../../shared/audit/identity-audit.publisher';
import { RegisterUseCase } from './application/register.use-case';
import { LoginUseCase } from './application/login.use-case';
import { LogoutUseCase } from './application/logout.use-case';
import { VerifyEmailUseCase, ResendVerificationUseCase } from './application/verify-email.use-case';
import { AuthController } from './api/auth.controller';
import { AuthGuard } from './api/auth.guard';

@Module({
  imports: [
    ConfigModule,
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
    UserRepository,
    EmailVerificationTokenRepository,
    IdentityAuditPublisher,
    RegisterUseCase,
    LoginUseCase,
    LogoutUseCase,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    AuthGuard,
  ],
  exports: [AuthGuard, AccessTokenService],
})
export class IdentityModule {}

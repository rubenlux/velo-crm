import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { RegisterUseCase } from '../application/register.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { VerifyEmailUseCase, ResendVerificationUseCase } from '../application/verify-email.use-case';
import { RequestPasswordResetUseCase } from '../application/request-password-reset.use-case';
import { ConfirmPasswordResetUseCase } from '../application/confirm-password-reset.use-case';
import { ChangePasswordUseCase } from '../application/change-password.use-case';
import { ListSessionsUseCase } from '../application/list-sessions.use-case';
import { RevokeSessionUseCase, RevokeAllSessionsUseCase } from '../application/revoke-session.use-case';
import { EnrollMfaUseCase, EnableMfaUseCase } from '../application/mfa-enroll.use-case';
import { MfaVerifyUseCase } from '../application/mfa-verify.use-case';
import { DisableMfaUseCase } from '../application/mfa-disable.use-case';
import { OAuthLoginUseCase, OAuthProfile } from '../application/oauth-login.use-case';
import { RefreshTokenService } from '../infrastructure/refresh-token.service';
import { AccessTokenService } from '../infrastructure/jwt.service';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { AuthThrottlerGuard } from './auth-throttler.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto, ResendVerificationDto, VerifyEmailDto } from './dto/token.dto';
import { ChangePasswordDto, ConfirmPasswordResetDto, RequestPasswordResetDto } from './dto/password.dto';
import { DisableMfaDto, EnableMfaDto, VerifyMfaDto } from './dto/mfa.dto';

interface OAuthRequest extends Request {
  user: OAuthProfile;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly confirmPasswordResetUseCase: ConfirmPasswordResetUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase,
    private readonly enrollMfaUseCase: EnrollMfaUseCase,
    private readonly enableMfaUseCase: EnableMfaUseCase,
    private readonly mfaVerifyUseCase: MfaVerifyUseCase,
    private readonly disableMfaUseCase: DisableMfaUseCase,
    private readonly oauthLoginUseCase: OAuthLoginUseCase,
    private readonly refreshTokens: RefreshTokenService,
    private readonly accessTokens: AccessTokenService,
  ) {}

  @UseGuards(AuthThrottlerGuard)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { user, emailVerificationToken } = await this.registerUseCase.execute(dto);
    return {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      // Exposed only until a real email delivery channel exists.
      emailVerificationToken,
    };
  }

  @UseGuards(AuthThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      rememberMe: dto.rememberMe,
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });

    if (result.mfaRequired) {
      return { mfaRequired: true, mfaChallengeToken: result.mfaChallengeToken };
    }

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        emailVerified: Boolean(result.user.emailVerifiedAt),
      },
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest, @Body() dto: RefreshTokenDto) {
    await this.logoutUseCase.execute(req.user.id, dto.refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    const { session, plainRefreshToken } = await this.refreshTokens.rotate(dto.refreshToken);
    const accessToken = this.accessTokens.sign({ sub: session.userId, email: '' });
    return { accessToken, refreshToken: plainRefreshToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.verifyEmailUseCase.execute(dto.token);
    return { verified: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email/resend')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    const emailVerificationToken = await this.resendVerificationUseCase.execute(dto.email);
    return { emailVerificationToken };
  }

  @UseGuards(AuthThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('password/reset-request')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    const passwordResetToken = await this.requestPasswordResetUseCase.execute(dto.email);
    // Always return 200 regardless of whether the email exists (US2 does not leak this).
    return passwordResetToken ? { passwordResetToken } : { requested: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('password/reset-confirm')
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    await this.confirmPasswordResetUseCase.execute(dto.token, dto.newPassword);
    return { reset: true };
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('password/change')
  async changePassword(@Req() req: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
    await this.changePasswordUseCase.execute(req.user.id, dto.currentPassword, dto.newPassword);
    return { changed: true };
  }

  @UseGuards(AuthGuard)
  @Get('sessions')
  async listSessions(@Req() req: AuthenticatedRequest) {
    return this.listSessionsUseCase.execute(req.user.id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('sessions/:sessionId')
  async revokeSession(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    await this.revokeSessionUseCase.execute(req.user.id, sessionId);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('sessions')
  async revokeAllSessions(@Req() req: AuthenticatedRequest) {
    await this.revokeAllSessionsUseCase.execute(req.user.id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('mfa/enroll')
  async enrollMfa(@Req() req: AuthenticatedRequest) {
    return this.enrollMfaUseCase.execute(req.user.id);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('mfa/enable')
  async enableMfa(@Req() req: AuthenticatedRequest, @Body() dto: EnableMfaDto) {
    await this.enableMfaUseCase.execute(req.user.id, dto.code);
    return { enabled: true };
  }

  @UseGuards(AuthThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('mfa/verify')
  async verifyMfa(@Body() dto: VerifyMfaDto) {
    const { user, accessToken, refreshToken } = await this.mfaVerifyUseCase.execute(
      dto.mfaChallengeToken,
      dto.code,
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, emailVerified: Boolean(user.emailVerifiedAt) },
    };
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('mfa/disable')
  async disableMfa(@Req() req: AuthenticatedRequest, @Body() dto: DisableMfaDto) {
    await this.disableMfaUseCase.execute(req.user.id, dto.currentPassword);
    return { disabled: true };
  }

  @UseGuards(PassportAuthGuard('google'))
  @Get('oauth/google')
  googleAuth() {
    // Passport's GoogleStrategy handles the redirect to Google's consent screen.
  }

  @UseGuards(PassportAuthGuard('google'))
  @HttpCode(HttpStatus.OK)
  @Get('oauth/google/callback')
  async googleCallback(@Req() req: OAuthRequest) {
    return this.completeOAuthLogin(req);
  }

  @UseGuards(PassportAuthGuard('microsoft'))
  @Get('oauth/microsoft')
  microsoftAuth() {
    // Passport's MicrosoftStrategy handles the redirect to Microsoft's consent screen.
  }

  @UseGuards(PassportAuthGuard('microsoft'))
  @HttpCode(HttpStatus.OK)
  @Get('oauth/microsoft/callback')
  async microsoftCallback(@Req() req: OAuthRequest) {
    return this.completeOAuthLogin(req);
  }

  private async completeOAuthLogin(req: OAuthRequest) {
    const { user, accessToken, refreshToken } = await this.oauthLoginUseCase.execute(
      req.user,
      req.headers['user-agent'] ?? 'unknown',
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, emailVerified: Boolean(user.emailVerifiedAt) },
    };
  }
}

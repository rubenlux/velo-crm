import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RegisterUseCase } from '../application/register.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { VerifyEmailUseCase, ResendVerificationUseCase } from '../application/verify-email.use-case';
import { RefreshTokenService } from '../infrastructure/refresh-token.service';
import { AccessTokenService } from '../infrastructure/jwt.service';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { AuthThrottlerGuard } from './auth-throttler.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto, ResendVerificationDto, VerifyEmailDto } from './dto/token.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
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
    const { user, accessToken, refreshToken } = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      rememberMe: dto.rememberMe,
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, emailVerified: Boolean(user.emailVerifiedAt) },
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
}

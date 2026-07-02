import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, MicrosoftStrategyOptions } from 'passport-microsoft';
import { OAuthProfile } from '../../application/oauth-login.use-case';

interface MicrosoftProfile {
  id: string;
  emails?: Array<{ type?: string; value: string }>;
}

/**
 * Microsoft OAuth2 login, per research.md #3. Requires MICROSOFT_OAUTH_CLIENT_ID/
 * SECRET/CALLBACK_URL to be configured to actually authenticate; falls back to inert
 * placeholder values otherwise so the app can still boot in local development.
 */
@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(config: ConfigService) {
    const options: MicrosoftStrategyOptions = {
      clientID: config.get<string>('MICROSOFT_OAUTH_CLIENT_ID') || 'not-configured',
      clientSecret: config.get<string>('MICROSOFT_OAUTH_CLIENT_SECRET') || 'not-configured',
      callbackURL:
        config.get<string>('MICROSOFT_OAUTH_CALLBACK_URL') ||
        'http://localhost:3000/api/v1/auth/oauth/microsoft/callback',
      scope: ['user.read'],
    };
    super(options);
  }

  validate(_accessToken: string, _refreshToken: string, profile: MicrosoftProfile): OAuthProfile {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('microsoft_profile_missing_email');
    }

    return {
      provider: 'microsoft',
      providerAccountId: profile.id,
      email,
      // Microsoft Graph does not report a per-email verification flag; a work/school
      // account email returned by Graph is treated as verified (research.md #3).
      emailVerified: true,
    };
  }
}

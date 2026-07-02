import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, Profile } from 'passport-google-oauth20';
import { OAuthProfile } from '../../application/oauth-login.use-case';

/**
 * Google OAuth2 login, per research.md #3. Requires GOOGLE_OAUTH_CLIENT_ID/SECRET/
 * CALLBACK_URL to be configured to actually authenticate; falls back to inert
 * placeholder values otherwise so the app can still boot in local development.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    const options: StrategyOptions = {
      clientID: config.get<string>('GOOGLE_OAUTH_CLIENT_ID') || 'not-configured',
      clientSecret: config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET') || 'not-configured',
      callbackURL:
        config.get<string>('GOOGLE_OAUTH_CALLBACK_URL') ||
        'http://localhost:3000/api/v1/auth/oauth/google/callback',
      scope: ['email', 'profile'],
    };
    super(options);
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('google_profile_missing_email');
    }

    return {
      provider: 'google',
      providerAccountId: profile.id,
      email,
      emailVerified: profile.emails?.[0]?.verified === true,
    };
  }
}
